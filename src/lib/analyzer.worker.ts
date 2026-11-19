import { createOpenCvJsAdapter, DEFAULT_DETECTION_CONFIG, type DetectionState, processFrame } from '@/detection';

/* eslint-disable @typescript-eslint/no-explicit-any -- opencv.js has no usable runtime types */

/**
 * Runs the screen detection engine on frames of the received video, off the
 * main thread so analysis can't stutter the player. Frames stay in this browser;
 * only the resulting measurements are reported to the backend.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope & { cv?: any };

let adapter: ReturnType<typeof createOpenCvJsAdapter> | null = null;
let previous: DetectionState | null = null;

function start(): void {
  try {
    scope.importScripts('/vendor/opencv.js');
  } catch (error) {
    scope.postMessage({ type: 'error', message: `Could not load OpenCV: ${String(error)}` });
    return;
  }
  // opencv.js is a thenable that resolves to itself, so it must never be awaited
  // or returned from a promise. Wait on the init hook instead.
  const cv = scope.cv;
  const ready = () => {
    adapter = createOpenCvJsAdapter(cv);
    scope.postMessage({ type: 'ready' });
  };
  if (cv.Mat) ready();
  else cv.onRuntimeInitialized = ready;
}

scope.onmessage = (message: MessageEvent<{ id: number; width: number; height: number; rgba: ArrayBuffer; mirrored?: boolean }>) => {
  if (!adapter) return;
  const { id, width, height, rgba, mirrored = false } = message.data;
  const pixels = new Uint8Array(rgba);
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (pixels[i * 4]! * 77 + pixels[i * 4 + 1]! * 150 + pixels[i * 4 + 2]! * 29) >> 8;
  }
  try {
    const output = processFrame(adapter, { data: gray, width, height }, DEFAULT_DETECTION_CONFIG, previous, { mirrored });
    previous = output.state;
    scope.postMessage({ type: 'result', id, result: output.result });
  } catch (error) {
    scope.postMessage({ type: 'error', message: String(error) });
  }
};

start();
