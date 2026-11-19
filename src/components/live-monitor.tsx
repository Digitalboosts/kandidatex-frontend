'use client';

import {
  type DetectionResult,
  type InterviewDTO,
  type MonitoringEventDTO,
  type MonitoringEventType,
  type MonitoringStatusDTO,
  REALTIME_TOPIC,
  type RealtimeMessage,
} from '@/types';
import {
  RoomAudioRenderer,
  useConnectionQualityIndicator,
  useConnectionState,
  useDataChannel,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { ConnectionQuality, ConnectionState, type RemoteParticipant, type RemoteVideoTrack, Track } from 'livekit-client';
import { CircleAlert, TriangleAlert, VideoOff, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { capitalize, formatDuration } from '@/lib/format';
import { deriveLiveStatus } from '@/lib/live-status';
import { useSessionUser } from '@/lib/session';
import { useInterviewRecorder } from '@/lib/use-interview-recorder';
import { useScreenAnalyzer } from '@/lib/use-screen-analyzer';
import { useStreamAnalyzer } from '@/lib/use-stream-analyzer';
import { ConfirmDialog } from './confirm-dialog';
import { EventTimeline } from './event-timeline';
import { RecordingButton, RecordingIndicator } from './recording-control';
import { fromReviewEvent, type ScreenAlert, ScreenAlertDialog } from './screen-alert-dialog';
import { ScreenAppPanel } from './screen-app-panel';
import { Button, Card, ErrorNote, StatusBadge } from './ui';

const POLL_INTERVAL_MS = 5000;
const STATUS_HEARTBEAT_MS = 5000;
const STALL_CHECK_MS = 2000;
const STALL_AFTER_MS = 6000;
const UNSTABLE_AFTER_MS = 6000;
const TOAST_MS = 8000;

type TimelineFilter = 'all' | 'events' | 'screen';
const TIMELINE_FILTERS: { value: TimelineFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'events', label: 'Events' },
  { value: 'screen', label: 'Screen' },
];

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
  neutral: 'text-ink-muted',
};

function StatusCard({ label, value, tone, testId }: { label: string; value: string; tone: Tone; testId: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p data-testid={testId} className={`mt-0.5 text-sm font-semibold ${TONE_TEXT[tone]}`}>
        {value}
      </p>
    </Card>
  );
}

const candidateFilter = (participant: { identity: string }) => participant.identity.startsWith('candidate-');

function useDuration(startedAt: string | null, enabled: boolean): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return startedAt ? formatDuration((now - new Date(startedAt).getTime()) / 1000) : '00:00';
}

function CandidateQuality({ participant, onChange }: { participant: RemoteParticipant; onChange: (q: ConnectionQuality) => void }) {
  const { quality } = useConnectionQualityIndicator({ participant });
  useEffect(() => onChange(quality), [quality, onChange]);
  return null;
}

export function LiveMonitor({
  interview,
  onInterviewChanged,
}: {
  interview: InterviewDTO;
  onInterviewChanged: (interview: InterviewDTO) => void;
}) {
  const user = useSessionUser();
  const id = interview.id;
  const canReport = user?.id === interview.interviewerId;

  const connectionState = useConnectionState();
  const participants = useRemoteParticipants();
  const candidate = participants.find(candidateFilter);
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true }).filter((track) =>
    candidateFilter(track.participant),
  );
  const cameraTrack = cameraTracks[0];
  const hasVideo = Boolean(cameraTrack?.publication.track) && !cameraTrack?.publication.isMuted;
  const microphoneTrack = useTracks([Track.Source.Microphone], { onlySubscribed: true }).find((track) =>
    candidateFilter(track.participant),
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const [events, setEvents] = useState<MonitoringEventDTO[]>([]);
  const [status, setStatus] = useState<MonitoringStatusDTO | null>(interview.monitoringStatus ?? null);
  const [liveResult, setLiveResult] = useState<DetectionResult | null>(null);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [videoStalled, setVideoStalled] = useState(false);
  const [toasts, setToasts] = useState<MonitoringEventDTO[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  /** Popup from a server event, for viewers whose own browser isn't running screen analysis. */
  const [eventAlert, setEventAlert] = useState<ScreenAlert | null>(null);
  const seenEvents = useRef<Set<string> | null>(null);
  const canReportRef = useRef(canReport);
  useEffect(() => {
    canReportRef.current = canReport;
  }, [canReport]);

  const addEvents = useCallback((incoming: MonitoringEventDTO[]) => {
    const isInitialLoad = seenEvents.current === null;
    seenEvents.current ??= new Set();
    const seen = seenEvents.current;
    const fresh = incoming.filter((event) => !seen.has(event.id));
    if (fresh.length === 0) return;
    fresh.forEach((event) => seen.add(event.id));
    setEvents((current) => [...current, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    // Only events arriving during this visit raise a notification, not history.
    if (!isInitialLoad) {
      // A suspicious screen gets the popup instead of a toast.
      const warnings = fresh.filter((event) => event.severity !== 'INFO' && event.eventType !== 'screen_app_review');
      if (warnings.length > 0) setToasts((current) => [...current, ...warnings].slice(-4));
      // The owner's browser pops up from its own analysis (with the frame); everyone else from the event.
      const review = [...fresh].reverse().find((event) => event.eventType === 'screen_app_review');
      if (review && !canReportRef.current) {
        // The event links to the stored alert, so this popup can show the screenshot too.
        setEventAlert(fromReviewEvent(review));
      }
    }
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((current) => current.slice(1)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  // The realtime channel is the fast path. Polling covers anything it missed
  // and everything that happens while the room isn't connected.
  const poll = useCallback(async () => {
    const [details, timeline] = await Promise.all([
      api<{ interview: InterviewDTO }>(`/api/interviews/${id}`),
      api<{ events: MonitoringEventDTO[] }>(`/api/interviews/${id}/events?limit=500`),
    ]);
    onInterviewChanged(details.interview);
    setStatus((current) => details.interview.monitoringStatus ?? current);
    addEvents(timeline.events);
  }, [id, addEvents, onInterviewChanged]);

  useEffect(() => {
    const first = setTimeout(() => void poll().catch(() => undefined), 0);
    const timer = setInterval(() => void poll().catch(() => undefined), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [poll]);

  useDataChannel(REALTIME_TOPIC, (message) => {
    const data = JSON.parse(new TextDecoder().decode(message.payload)) as RealtimeMessage;
    if (data.type === 'event') addEvents([data.event]);
    else if (data.type === 'status') setStatus(data.status);
    else if (data.type === 'session_ended') void poll();
  });

  const report = useCallback(
    (eventType: MonitoringEventType) => {
      if (!canReport) return;
      void api('/api/monitoring/events', { body: { interviewId: id, eventType } }).catch(() => undefined);
    },
    [canReport, id],
  );

  // Only the interviewer who owns the interview posts analysis, so two people
  // watching at once don't produce overlapping updates.
  const lastPost = useRef<{ key: string; at: number } | null>(null);
  const onAnalysis = useCallback(
    (result: DetectionResult) => {
      setLiveResult(result);
      if (!canReport) return;
      const payload = {
        interviewId: id,
        source: 'stream_analysis',
        screenDetected: result.screenDetected,
        visibilityPercentage: result.visibilityPercentage,
        clarity: result.clarity,
        lighting: result.lighting,
        stability: result.stability,
        alignment: result.alignment,
        readinessScore: result.readinessScore,
      };
      // The score wobbles frame to frame, so it alone doesn't justify an update.
      const key = JSON.stringify({ ...payload, readinessScore: 0 });
      const now = Date.now();
      if (lastPost.current?.key === key && now - lastPost.current.at < STATUS_HEARTBEAT_MS) return;
      lastPost.current = { key, at: now };
      void api('/api/monitoring/status', { body: payload }).catch(() => undefined);
    },
    [canReport, id],
  );

  const analyzerState = useStreamAnalyzer(videoRef, hasVideo && !videoStalled, onAnalysis);
  // Same rule as above: only the owner sends frames, which also keeps the
  // per-interview rate limit and the timeline free of duplicates.
  const screenAnalyzer = useScreenAnalyzer(videoRef, id, canReport && hasVideo && !videoStalled);
  const analyzerAlert = screenAnalyzer.alert;
  const popup: ScreenAlert | null = analyzerAlert?.result
    ? {
        id: analyzerAlert.id,
        at: analyzerAlert.at,
        application: analyzerAlert.result.application,
        category: analyzerAlert.result.category,
        message: analyzerAlert.result.message,
        activity: analyzerAlert.result.activity,
        confidence: analyzerAlert.result.confidence,
        image: analyzerAlert.image,
      }
    : eventAlert;
  const { openAlert } = screenAnalyzer;
  const closePopup = useCallback(() => {
    openAlert(null);
    setEventAlert(null);
  }, [openAlert]);

  const recorder = useInterviewRecorder(
    id,
    cameraTrack?.publication.track?.mediaStreamTrack,
    microphoneTrack?.publication.track?.mediaStreamTrack,
  );

  // Video stops silently when packets stop arriving, with no track event, so
  // watch the decoded-frame counter.
  useEffect(() => {
    const track = cameraTrack?.publication.track as RemoteVideoTrack | undefined;
    if (!track) return;
    let lastFrames = -1;
    let lastProgressAt = Date.now();
    let stalled = false;
    const timer = setInterval(async () => {
      const stats = await track.getReceiverStats().catch(() => undefined);
      const frames = stats?.framesDecoded ?? 0;
      const now = Date.now();
      if (frames !== lastFrames) {
        lastFrames = frames;
        lastProgressAt = now;
        if (stalled) {
          stalled = false;
          setVideoStalled(false);
          report('video_resumed');
        }
      } else if (!stalled && now - lastProgressAt >= STALL_AFTER_MS) {
        stalled = true;
        setVideoStalled(true);
        report('video_stopped');
      }
    }, STALL_CHECK_MS);
    return () => {
      clearInterval(timer);
      setVideoStalled(false);
    };
  }, [cameraTrack?.publication.track, report]);

  const unstable = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;
  const wasUnstable = useRef(false);
  useEffect(() => {
    if (unstable && !wasUnstable.current) {
      const timer = setTimeout(() => {
        wasUnstable.current = true;
        report('network_unstable');
      }, UNSTABLE_AFTER_MS);
      return () => clearTimeout(timer);
    }
    if (!unstable && wasUnstable.current) {
      wasUnstable.current = false;
      report('network_recovered');
    }
  }, [unstable, report]);

  const duration = useDuration(interview.startedAt, interview.status === 'ACTIVE');
  const live = useMemo(
    () => deriveLiveStatus({ hasVideo: hasVideo && !videoStalled, analyzerState, liveResult, status }),
    [hasVideo, videoStalled, analyzerState, liveResult, status],
  );

  const [confirmingEnd, setConfirmingEnd] = useState(false);
  /** Errors are shown inside the dialog, which stays open. */
  async function endSession() {
    const body = await api<{ interview: InterviewDTO }>(`/api/interviews/${id}/end`, { body: {} });
    setConfirmingEnd(false);
    onInterviewChanged(body.interview);
  }

  const connected = connectionState === ConnectionState.Connected;
  const connectionLabel = connected
    ? candidate
      ? 'Candidate connected'
      : 'Waiting for candidate'
    : capitalize(connectionState);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      {candidate ? <CandidateQuality participant={candidate} onChange={setQuality} /> : null}
      <RoomAudioRenderer />

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 data-testid="candidate-name" className="truncate text-xl font-semibold tracking-tight">
              {interview.candidateName}
            </h1>
            <p className="font-mono text-xs text-ink-muted">{id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={interview.status} />
            <span data-testid="duration" className="text-sm font-medium tabular-nums">
              {duration}
            </span>
            <RecordingButton recorder={recorder} />
            <Button variant="danger" onClick={() => setConfirmingEnd(true)}>
              End session
            </Button>
          </div>
        </div>
        <ErrorNote message={recorder.error} />

        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
          {cameraTrack && hasVideo ? (
            <VideoTrack
              trackRef={cameraTrack}
              ref={videoRef}
              data-testid="candidate-video"
              className="size-full object-contain"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-slate-300">
              <VideoOff className="size-8" aria-hidden />
              <p data-testid="no-video" className="text-sm">
                {candidate ? 'Candidate camera is not publishing' : 'Waiting for the candidate to start monitoring'}
              </p>
            </div>
          )}
          {videoStalled ? (
            <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-bad px-4 py-2 text-sm font-medium text-white">
              <CircleAlert className="size-4" aria-hidden /> Video transmission stopped
            </div>
          ) : null}
          {videoStalled ? null : <RecordingIndicator recorder={recorder} />}
        </div>

        <section aria-label="Monitoring status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatusCard label="Connection" testId="status-connection" value={connectionLabel} tone={connected && candidate ? 'good' : 'warn'} />
          <StatusCard label="Camera" testId="status-camera" value={hasVideo ? (videoStalled ? 'Stalled' : 'Streaming') : 'Off'} tone={hasVideo && !videoStalled ? 'good' : 'bad'} />
          <StatusCard label="Screen detection" testId="status-screen" {...live.screen} />
          <StatusCard label="Screen visibility" testId="status-visibility" {...live.visibility} />
          <StatusCard label="Camera quality" testId="status-clarity" {...live.clarity} />
          <StatusCard label="Lighting" testId="status-lighting" {...live.lighting} />
          <StatusCard label="Camera stability" testId="status-stability" {...live.stability} />
          <StatusCard label="Network" testId="status-network" value={unstable ? 'Unstable' : candidate ? 'Stable' : '—'} tone={unstable ? 'warn' : candidate ? 'good' : 'neutral'} />
        </section>
        <p data-testid="analysis-source" className="text-xs text-ink-muted">
          {live.note} Readings describe how well the screen can be seen on camera. They do not verify what is on the
          screen and are not a measure of cheating.
        </p>
        <ScreenAppPanel analyzer={screenAnalyzer} canAnalyze={canReport} />
      </div>

      <Card className="flex max-h-[720px] min-h-64 flex-col self-start overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
          <h2 className="text-sm font-semibold">Event timeline</h2>
          <div role="group" aria-label="Show" className="flex rounded-lg border border-line p-0.5 text-xs">
            {TIMELINE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={timelineFilter === value}
                data-testid={`timeline-filter-${value}`}
                onClick={() => setTimelineFilter(value)}
                className={`rounded-md px-2 py-1 font-medium ${
                  timelineFilter === value ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EventTimeline
            events={timelineFilter === 'screen' ? [] : events}
            screenAnalyses={timelineFilter === 'events' ? [] : screenAnalyzer.history}
            onOpenScreen={screenAnalyzer.openAlert}
            onOpenEvent={(event) => {
              screenAnalyzer.openAlert(null);
              setEventAlert(fromReviewEvent(event));
            }}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmingEnd}
        title="End this session?"
        description={
          <>
            The live session ends for you and <span className="font-medium text-ink">{interview.candidateName}</span>,
            and their camera stops. This can&apos;t be undone.
          </>
        }
        details={
          <ul className="space-y-1 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-soft">
            <li>Duration so far: {duration}</li>
            {recorder.state !== 'idle' ? <li>The recording stops and finishes uploading in the background.</li> : null}
            <li>The timeline stays available on the interview details page.</li>
          </ul>
        }
        confirmLabel="End session"
        busyLabel="Ending…"
        onConfirm={endSession}
        onCancel={() => setConfirmingEnd(false)}
      />

      <ScreenAlertDialog
        alert={popup}
        onClose={closePopup}
        onRecord={recorder.supported && recorder.state === 'idle' ? recorder.start : undefined}
      />

      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            data-testid="warning-toast"
            className="flex items-start gap-2 rounded-lg border border-line bg-white p-3 text-sm shadow-lg"
          >
            {toast.severity === 'CRITICAL' ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-bad" aria-label="Critical" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-label="Warning" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="text-ink-muted hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
