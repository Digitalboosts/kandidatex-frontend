'use client';

import { INSTRUCTION_TEXT, isReadyToContinue } from '@/detection';
import type { DetectionResult } from '@/types';
import { SwitchCamera } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { isInterviewEnded, reportEvent, reportStatus } from '@/lib/candidate-api';
import {
  BACK_CAMERA,
  type CameraChoice,
  describeResult,
  FRONT_CAMERA,
  isMirrored,
  useCameraStream,
} from '@/lib/candidate-camera';
import type { CandidateSession, EndedInfo } from '@/lib/use-candidate-live-session';
import { useStreamAnalyzer } from '@/lib/use-stream-analyzer';
import { StreamVideo } from './camera-selection-step';
import { Notice, StatusRow, StepShell, TONE_FILL } from './candidate-ui';

/** Calibration samples quickly, so the score responds as the camera moves. */
const DETECTION_INTERVAL_MS = 250;
const STATUS_REPORT_INTERVAL_MS = 2000;
/** Consecutive passing measurements required, so one lucky frame can't enable Continue. */
const REQUIRED_PASSING_FRAMES = 6;

/** The frame on screen a well-placed laptop should roughly fill, relative to the view. */
const GUIDE = { widthFraction: 0.86, aspectRatio: 1.6 };

interface Size {
  width: number;
  height: number;
}

function useElementSize(ref: React.RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * Draws the guide frame and the screen outline as detected. The video fills its
 * box like object-fit: cover, so normalized frame coordinates are scaled the same
 * way to land on the right pixels.
 */
function GuideOverlay({
  result,
  frame,
  view,
  mirrored,
  ready,
}: {
  result: DetectionResult | null;
  frame: Size | null;
  view: Size;
  mirrored: boolean;
  ready: boolean;
}) {
  if (view.width === 0) return null;
  const frameWidth = frame?.width || view.width;
  const frameHeight = frame?.height || view.height;
  const scale = Math.max(view.width / frameWidth, view.height / frameHeight);
  const toView = (point: { x: number; y: number }) => {
    const x = (point.x * frameWidth - frameWidth / 2) * scale + view.width / 2;
    const y = (point.y * frameHeight - frameHeight / 2) * scale + view.height / 2;
    return { x: mirrored ? view.width - x : x, y };
  };
  const corners = (result?.corners ?? []).map(toView);
  const outline = ready ? 'var(--color-good)' : 'var(--color-brand-600)';
  const guideWidth = view.width * GUIDE.widthFraction;
  const guideHeight = Math.min(guideWidth / GUIDE.aspectRatio, view.height * 0.86);

  return (
    <svg className="pointer-events-none absolute inset-0" width={view.width} height={view.height} aria-hidden>
      <rect
        x={(view.width - guideWidth) / 2}
        y={(view.height - guideHeight) / 2}
        width={guideWidth}
        height={guideHeight}
        rx={10}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.75}
        strokeWidth={2}
        strokeDasharray="10 8"
      />
      {corners.length > 0 ? (
        <polygon
          points={corners.map((corner) => `${corner.x},${corner.y}`).join(' ')}
          fill={outline}
          fillOpacity={0.12}
          stroke={outline}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      ) : null}
      {corners.map((corner, index) => (
        <circle key={index} cx={corner.x} cy={corner.y} r={6} fill="#FFFFFF" stroke={outline} strokeWidth={3} />
      ))}
    </svg>
  );
}

export function CalibrationStep({
  session,
  camera,
  onCameraChange,
  onPassed,
  onEnded,
}: {
  session: CandidateSession;
  camera: CameraChoice;
  onCameraChange: (choice: CameraChoice) => void;
  onPassed: () => void;
  onEnded: (info?: EndedInfo) => void;
}) {
  const mirrored = isMirrored(camera);
  const threshold = session.readinessThreshold;
  const { stream, error: cameraError } = useCameraStream(camera, true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const view = useElementSize(boxRef);

  const [result, setResult] = useState<DetectionResult | null>(null);
  const [frame, setFrame] = useState<Size | null>(null);
  const [passingFrames, setPassingFrames] = useState(0);
  const lastReport = useRef(0);

  const onResult = useCallback(
    (next: DetectionResult) => {
      const video = videoRef.current;
      if (video?.videoWidth) {
        setFrame((current) =>
          current?.width === video.videoWidth && current.height === video.videoHeight
            ? current
            : { width: video.videoWidth, height: video.videoHeight },
        );
      }
      setResult(next);
      setPassingFrames((count) => (isReadyToContinue(next, threshold) ? count + 1 : 0));

      const now = Date.now();
      if (now - lastReport.current < STATUS_REPORT_INTERVAL_MS) return;
      lastReport.current = now;
      // Only measured numbers are sent, never image data.
      reportStatus(session.token, {
        interviewId: session.interview.id,
        source: 'calibration',
        screenDetected: next.screenDetected,
        visibilityPercentage: next.visibilityPercentage,
        clarity: next.clarity,
        lighting: next.lighting,
        stability: next.stability,
        alignment: next.alignment,
        readinessScore: next.readinessScore,
      }).catch((error) => {
        if (isInterviewEnded(error)) onEnded();
      });
    },
    [threshold, session, onEnded],
  );

  const analyzer = useStreamAnalyzer(videoRef, Boolean(stream), onResult, {
    intervalMs: DETECTION_INTERVAL_MS,
    smoothingWindow: 1,
    mirrored,
  });
  const ready = passingFrames >= REQUIRED_PASSING_FRAMES;

  function proceed() {
    reportEvent(session.token, session.interview.id, 'calibration_passed').catch(() => undefined);
    // Leaving this step stops the preview, so the camera is free before LiveKit opens it.
    onPassed();
  }

  function switchCamera() {
    setResult(null);
    setPassingFrames(0);
    onCameraChange(mirrored ? BACK_CAMERA : FRONT_CAMERA);
  }

  const instruction = !result
    ? analyzer === 'loading'
      ? 'Loading screen detection…'
      : 'Looking for your screen…'
    : result.instructions[0] === 'properly_positioned' && !ready
      ? 'Hold still…'
      : INSTRUCTION_TEXT[result.instructions[0] ?? 'point_at_screen'];
  const scoreColor = !result ? 'text-ink-muted' : result.readinessScore >= threshold ? 'text-good' : 'text-warn';

  return (
    <StepShell wide>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div
          ref={boxRef}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-ink sm:aspect-[4/3]"
        >
          <StreamVideo stream={stream} mirrored={mirrored} videoRef={videoRef} />
          <GuideOverlay result={result} frame={frame} view={view} mirrored={mirrored} ready={ready} />
          <div className="absolute inset-x-0 top-3 flex justify-center px-3">
            <p
              data-testid="instruction"
              className="max-w-[90%] rounded-lg bg-ink/80 px-4 py-2 text-center text-base font-semibold text-white"
            >
              {instruction}
            </p>
          </div>
          <button
            type="button"
            data-testid="switch-camera"
            onClick={switchCamera}
            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-ink/80 px-3 py-2 text-xs font-semibold text-white"
          >
            <SwitchCamera className="size-4" aria-hidden />
            {mirrored ? 'Use back' : 'Use front'}
          </button>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <p data-testid="readiness-score" className={`min-w-20 text-5xl font-bold tracking-tight tabular-nums ${scoreColor}`}>
              {result ? result.readinessScore : '--'}
            </p>
            <div>
              <p className="text-sm font-semibold">Screen capture readiness</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                Needs {threshold} to continue. This scores how well the camera sees your screen, nothing else.
              </p>
            </div>
          </div>

          <div className="relative mt-4 mb-3 h-1.5 rounded-full bg-line">
            <div
              className={`h-1.5 rounded-full transition-[width] ${result ? TONE_FILL[ready ? 'good' : 'warn'] : ''}`}
              style={{ width: `${result?.readinessScore ?? 0}%` }}
            />
            <div className="absolute -top-[3px] h-3 w-0.5 bg-ink" style={{ left: `${threshold}%` }} />
          </div>

          {result ? describeResult(result).map((line) => <StatusRow key={line.label} {...line} />) : null}
          <div className="mt-3 space-y-2">
            {cameraError ? <Notice text={cameraError} /> : null}
            {analyzer === 'error' ? (
              <Notice text="Screen detection hit a problem. Try switching cameras or reloading the page." />
            ) : null}
          </div>

          <Button data-testid="calibration-continue" className="mt-4 w-full" disabled={!ready} onClick={proceed}>
            Continue
          </Button>
        </Card>
      </div>
    </StepShell>
  );
}
