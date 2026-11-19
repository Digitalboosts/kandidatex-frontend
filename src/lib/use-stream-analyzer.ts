'use client';

import { createResultSmoother, DEFAULT_DETECTION_CONFIG } from '@/detection';
import type { DetectionResult } from '@/types';
import { type RefObject, useEffect, useRef, useState } from 'react';

const ANALYSIS_INTERVAL_MS = 1000;
const SMOOTHING_WINDOW = 3;

export type AnalyzerState = 'off' | 'loading' | 'running' | 'error';

export interface StreamAnalyzerOptions {
  /** How often a frame is sampled. Frames arriving while the worker is busy are skipped. */
  intervalMs?: number;
  /** Results to smooth over. 1 passes every result straight through. */
  smoothingWindow?: number;
  /** The video comes from a front camera shown mirrored, so left and right instructions swap. */
  mirrored?: boolean;
}

/**
 * Samples the given video element about once a second and analyzes the frame
 * in a worker. `onResult` receives smoothed, real measurements. No frame leaves
 * the browser.
 */
export function useStreamAnalyzer(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onResult: (result: DetectionResult) => void,
  options: StreamAnalyzerOptions = {},
): AnalyzerState {
  const { intervalMs = ANALYSIS_INTERVAL_MS, smoothingWindow = SMOOTHING_WINDOW, mirrored = false } = options;
  const [state, setState] = useState<AnalyzerState>('off');
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker(new URL('./analyzer.worker.ts', import.meta.url));
    const smooth = createResultSmoother(smoothingWindow);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let busy = false;
    let ready = false;
    let frameId = 0;

    const loadingTimer = setTimeout(() => setState('loading'), 0);
    worker.onmessage = (message: MessageEvent) => {
      const data = message.data as
        | { type: 'ready' }
        | { type: 'error'; message: string }
        | { type: 'result'; result: DetectionResult };
      if (data.type === 'ready') {
        ready = true;
        setState('running');
      } else if (data.type === 'error') {
        busy = false;
        console.error('Stream analyzer error:', data.message);
        setState('error');
      } else {
        busy = false;
        onResultRef.current(smooth(data.result));
      }
    };
    worker.onerror = () => setState('error');

    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!ready || busy || !context || !video || video.readyState < 2 || video.videoWidth === 0) return;
      const width = DEFAULT_DETECTION_CONFIG.processingWidth;
      const height = Math.round((video.videoHeight / video.videoWidth) * width);
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      busy = true;
      frameId += 1;
      worker.postMessage({ id: frameId, width, height, rgba: data.buffer, mirrored }, [data.buffer]);
    }, intervalMs);

    return () => {
      clearTimeout(loadingTimer);
      clearInterval(timer);
      worker.terminate();
      setState('off');
    };
  }, [enabled, videoRef, intervalMs, smoothingWindow, mirrored]);

  return state;
}
