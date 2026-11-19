'use client';

import type { LocalVideoTrack } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { endInterview } from '@/lib/candidate-api';
import { type CameraChoice, isMirrored, type Tone } from '@/lib/candidate-camera';
import { formatDuration } from '@/lib/format';
import {
  type CandidateSession,
  type EndedInfo,
  useCandidateLiveSession,
  useWakeLock,
} from '@/lib/use-candidate-live-session';
import { Notice, StatusRow, StepShell } from './candidate-ui';

const CONNECTION: Record<string, { value: string; tone: Tone }> = {
  connecting: { value: 'Connecting', tone: 'warn' },
  connected: { value: 'Connected', tone: 'good' },
  reconnecting: { value: 'Reconnecting', tone: 'warn' },
  disconnected: { value: 'Disconnected', tone: 'bad' },
};

function LocalPreview({ track, mirrored }: { track: LocalVideoTrack; mirrored: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    track.attach(video);
    return () => {
      track.detach(video);
    };
  }, [track]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={`absolute inset-0 size-full object-cover ${mirrored ? '-scale-x-100' : ''}`}
    />
  );
}

export function LiveMonitoringStep({
  session,
  camera,
  onEnded,
}: {
  session: CandidateSession;
  camera: CameraChoice;
  onEnded: (info?: EndedInfo) => void;
}) {
  // Sleeping would stop the camera, and with it the session.
  useWakeLock(true);

  const { state, retryCamera } = useCandidateLiveSession(session, camera);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.startedAt]);
  const elapsed = state.startedAt ? (now - state.startedAt) / 1000 : 0;

  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  useEffect(() => {
    if (state.ended) onEndedRef.current(state.ended);
  }, [state.ended]);

  // Closing or reloading the tab shouldn't silently leave a live session.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  function end() {
    setEnding(true);
    setEndError(null);
    endInterview(session.token, session.interview.id)
      .then(() => onEnded({ endedBy: 'candidate' }))
      .catch(() => {
        setEnding(false);
        setEndError('Could not end the session. Check your connection and try again.');
      });
  }

  const connection = CONNECTION[state.connection]!;
  const networkTone: Tone = !state.online ? 'bad' : state.poorNetwork ? 'warn' : 'good';
  const networkValue = !state.online ? 'Offline' : state.poorNetwork ? 'Unstable' : 'Stable';

  return (
    <StepShell wide>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-ink sm:aspect-[4/3]">
          {state.track ? (
            <LocalPreview track={state.track} mirrored={isMirrored(camera)} />
          ) : (
            <p className="text-sm text-white">{state.camera === 'error' ? 'Camera unavailable' : 'Starting camera…'}</p>
          )}
          {state.camera === 'streaming' ? (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-bad px-2 py-1 text-xs font-bold tracking-wide text-white">
              <span className="size-1.5 rounded-full bg-white" aria-hidden /> LIVE
            </span>
          ) : null}
          <span
            data-testid="duration"
            className="absolute top-3 right-3 rounded-md bg-ink/80 px-2 py-1 text-xs font-semibold text-white tabular-nums"
          >
            {formatDuration(elapsed)}
          </span>
        </div>

        <Card className="p-5">
          <h1 className="text-lg font-semibold">{session.interview.title}</h1>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Keep your laptop screen in view, and keep this tab open. Your interviewer sees this camera live.
          </p>

          <div className="mt-4 space-y-2">
            {state.notice ? <Notice text={state.notice} tone="warn" /> : null}
            {state.cameraError ? (
              <>
                <Notice text={state.cameraError} />
                <Button variant="secondary" className="w-full" onClick={retryCamera}>
                  Try again
                </Button>
              </>
            ) : null}
          </div>

          <div className="mt-4 rounded-lg bg-canvas px-3 py-1">
            <StatusRow label="Connection" {...connection} testId="candidate-connection" />
            <StatusRow
              label="Camera"
              value={state.camera === 'streaming' ? 'Streaming' : state.camera === 'error' ? 'Error' : 'Starting'}
              tone={state.camera === 'streaming' ? 'good' : state.camera === 'error' ? 'bad' : 'warn'}
              testId="candidate-camera"
            />
            <StatusRow label="Internet" value={networkValue} tone={networkTone} />
            <StatusRow
              label="Interviewer"
              value={state.interviewerPresent ? 'Watching' : 'Not connected yet'}
              tone={state.interviewerPresent ? 'good' : 'warn'}
            />
          </div>

          {confirming ? (
            <div role="alertdialog" aria-labelledby="end-title" className="mt-4 rounded-lg border border-line p-4">
              <p id="end-title" className="text-sm font-semibold">
                End this session?
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Your interviewer will stop seeing your camera, and you can&apos;t rejoin.
              </p>
              {endError ? (
                <div className="mt-3">
                  <Notice text={endError} />
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)} disabled={ending}>
                  Keep going
                </Button>
                <Button data-testid="confirm-end-session" variant="danger" className="flex-1" onClick={end} disabled={ending}>
                  {ending ? 'Ending…' : 'End session'}
                </Button>
              </div>
            </div>
          ) : (
            <Button data-testid="end-session" variant="danger" className="mt-4 w-full" onClick={() => setConfirming(true)}>
              End session
            </Button>
          )}
        </Card>
      </div>
    </StepShell>
  );
}
