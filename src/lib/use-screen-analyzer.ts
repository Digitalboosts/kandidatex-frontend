'use client';

import type { ScreenAnalysisResult } from '@/types';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from './api';

/**
 * Frames are taken at a random moment, 1 to 10 s after the previous one, so
 * the timing can't be predicted. That averages about 11 a minute, well under
 * the API's 30 a minute per interview.
 */
const MIN_GAP_MS = 1000;
const MAX_GAP_MS = 10_000;
const RATE_LIMITED_BACKOFF_MS = 30_000;
/** Responses kept for the timeline. */
const HISTORY_LIMIT = 300;
/** Only the newest flagged responses keep their frame, to bound memory (~150 KB each). */
const FRAMES_KEPT = 20;

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.7;

const randomGap = () => MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);

/** Errors after which sending more frames can't succeed. */
const FATAL: Record<string, string> = {
  ai_not_configured: 'Screen analysis is not set up on the server.',
  interview_ended: 'The interview has ended.',
  forbidden: 'You are not allowed to analyse this interview.',
  not_found: 'Interview not found.',
};

export type ScreenAnalyzerState = 'off' | 'running' | 'stopped';

/** One frame sent for analysis: the response, or why it was skipped. */
export interface ScreenAnalysisEntry {
  id: string;
  /** ISO time the response arrived. */
  at: string;
  result: ScreenAnalysisResult | null;
  error: string | null;
  /** The JPEG that was analysed, kept only for recent HIGH responses. */
  image?: string;
}

export interface ScreenAnalyzer {
  state: ScreenAnalyzerState;
  /** Latest clear reading. Frames reported as `UNKNOWN` are ignored, so this keeps the last real one. */
  result: ScreenAnalysisResult | null;
  /** When `result` was received. */
  resultAt: number | null;
  /** Why analysis stopped, or the last skipped frame's reason. */
  note: string | null;
  /** Every response during this visit, oldest first, including UNKNOWN ones and skipped frames. */
  history: ScreenAnalysisEntry[];
}

/** Keeps the newest HIGH frames and drops the image from older entries. */
function append(history: ScreenAnalysisEntry[], item: ScreenAnalysisEntry): ScreenAnalysisEntry[] {
  const next = [...history, item].slice(-HISTORY_LIMIT);
  let framesSeen = 0;
  for (let index = next.length - 1; index >= 0; index--) {
    const current = next[index];
    if (!current?.image) continue;
    framesSeen += 1;
    if (framesSeen > FRAMES_KEPT) next[index] = { ...current, image: undefined };
  }
  return next;
}

function captureJpeg(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Sends a frame of the candidate's video to the AI screen analyzer at random
 * moments (1 to 10 s apart) and reports which application is on screen. The
 * server records HIGH and MEDIUM readings on the timeline itself, once per new
 * application; `history` holds every response for the live timeline.
 */
export function useScreenAnalyzer(
  videoRef: RefObject<HTMLVideoElement | null>,
  interviewId: string,
  enabled: boolean,
): ScreenAnalyzer & {
  /** A suspicious screen to show in a popup: a new HIGH reading, or one reopened from the timeline. */
  alert: ScreenAnalysisEntry | null;
  openAlert: (entry: ScreenAnalysisEntry | null) => void;
} {
  const [alert, setAlert] = useState<ScreenAnalysisEntry | null>(null);
  const openAlert = useCallback((entry: ScreenAnalysisEntry | null) => setAlert(entry), []);
  // The app last popped up for. The same app staying on screen doesn't pop up
  // again; it can once a different reading has come in between.
  const alertedApp = useRef<string | null>(null);
  const [analyzer, setAnalyzer] = useState<ScreenAnalyzer>({
    state: 'off',
    result: null,
    resultAt: null,
    note: null,
    history: [],
  });

  useEffect(() => {
    if (!enabled) return;
    const canvas = document.createElement('canvas');
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let sequence = 0;
    const entry = (result: ScreenAnalysisResult | null, error: string | null, image?: string): ScreenAnalysisEntry => ({
      id: `screen-${Date.now()}-${(sequence += 1)}`,
      at: new Date().toISOString(),
      result,
      error,
      image,
    });

    const schedule = (delay: number) => {
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    async function tick() {
      const video = videoRef.current;
      const image = video ? captureJpeg(video, canvas) : null;
      if (!image) return schedule(randomGap());
      try {
        const result = await api<ScreenAnalysisResult>('/api/monitoring/screen-analysis', {
          body: { interviewId, image },
        });
        if (cancelled) return;
        const flagged = result.alert_level === 'HIGH';
        const item = entry(result, null, flagged ? image : undefined);
        if (flagged && alertedApp.current !== result.application) {
          alertedApp.current = result.application;
          setAlert(item);
        } else if (!flagged && result.application !== 'UNKNOWN') {
          alertedApp.current = null;
        }
        setAnalyzer((current) =>
          result.application === 'UNKNOWN'
            ? { ...current, note: null, history: append(current.history, item) }
            : { state: 'running', result, resultAt: Date.now(), note: null, history: append(current.history, item) },
        );
        schedule(randomGap());
      } catch (caught) {
        if (cancelled) return;
        const error = caught instanceof ApiRequestError ? caught : null;
        const fatal = error ? FATAL[error.code] : undefined;
        const item = entry(null, fatal ?? error?.message ?? 'Frame skipped');
        if (fatal) {
          setAnalyzer((current) => ({ ...current, state: 'stopped', note: fatal, history: append(current.history, item) }));
          return;
        }
        // AI errors, timeouts and network blips: skip this frame and try the next.
        setAnalyzer((current) => ({ ...current, note: error?.message ?? null, history: append(current.history, item) }));
        schedule(error?.code === 'rate_limited' ? RATE_LIMITED_BACKOFF_MS : randomGap());
      }
    }

    const start = setTimeout(() => {
      setAnalyzer((current) => ({ ...current, state: 'running', note: null }));
      schedule(randomGap());
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearTimeout(timer);
      setAnalyzer((current) => ({ ...current, state: 'off' }));
    };
  }, [enabled, interviewId, videoRef]);

  return { ...analyzer, alert, openAlert };
}
