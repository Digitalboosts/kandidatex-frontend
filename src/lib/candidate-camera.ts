'use client';

import type { DetectionResult } from '@/types';
import { useEffect, useState } from 'react';

/**
 * A camera the candidate can pick. Back and front map to the browser's facingMode,
 * for phones. A specific device is offered too, for laptops and
 * external webcams where "back" and "front" don't mean anything.
 */
export interface CameraChoice {
  key: string;
  title: string;
  hint: string;
  facing?: 'back' | 'front';
  deviceId?: string;
}

export const BACK_CAMERA: CameraChoice = {
  key: 'back',
  title: 'Back Camera',
  hint: 'Recommended: point it at your laptop',
  facing: 'back',
};

export const FRONT_CAMERA: CameraChoice = {
  key: 'front',
  title: 'Front Camera',
  hint: 'If the back camera is unavailable',
  facing: 'front',
};

/** The front camera is shown mirrored, the way people expect to see themselves. */
export const isMirrored = (choice: CameraChoice) => choice.facing === 'front';

export function videoConstraints(choice: CameraChoice): MediaTrackConstraints {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (choice.deviceId) return { ...size, deviceId: { exact: choice.deviceId } };
  return { ...size, facingMode: { ideal: choice.facing === 'front' ? 'user' : 'environment' } };
}

export function isPermissionError(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? '';
  return name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError';
}

export function cameraErrorMessage(error: unknown): string {
  if (isPermissionError(error)) {
    return 'Camera access is blocked. Allow it for this site in your browser settings (the camera icon in the address bar), then try again.';
  }
  const name = (error as { name?: string })?.name ?? '';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'This camera isn’t available on this device.';
  if (name === 'NotReadableError') return 'The camera is in use by another app or tab. Close it and try again.';
  return 'The camera could not be started. Try again.';
}

export const mediaSupported = () =>
  typeof window !== 'undefined' && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);

export const INSECURE_CONTEXT_MESSAGE =
  'This browser can only use the camera on a secure (https) page. Open the joining link over https, or on localhost.';

/**
 * Opens a camera-only stream for previews and calibration, and stops it when the
 * choice changes, `active` turns off, or the component unmounts. The stream is never
 * recorded or sent anywhere: the live step publishes its own track through LiveKit.
 */
export function useCameraStream(choice: CameraChoice | null, active: boolean) {
  const [state, setState] = useState<{ stream: MediaStream | null; error: string | null; key: string | null }>({
    stream: null,
    error: null,
    key: null,
  });
  const key = choice && active ? JSON.stringify(videoConstraints(choice)) : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let opened: MediaStream | null = null;
    if (!mediaSupported()) {
      queueMicrotask(() => !cancelled && setState({ stream: null, error: INSECURE_CONTEXT_MESSAGE, key }));
      return () => {
        cancelled = true;
      };
    }
    navigator.mediaDevices
      .getUserMedia({ video: JSON.parse(key) as MediaTrackConstraints, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        opened = stream;
        setState({ stream, error: null, key });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ stream: null, error: cameraErrorMessage(error), key });
      });
    return () => {
      cancelled = true;
      opened?.getTracks().forEach((track) => track.stop());
    };
  }, [key]);

  // A result for an older choice is never shown for the current one.
  const current = state.key === key;
  return { stream: current ? state.stream : null, error: current ? state.error : null, loading: Boolean(key) && !current };
}

/** Video inputs this browser can see. Labels are only filled in once camera access is granted. */
export function useVideoDevices(enabled: boolean): MediaDeviceInfo[] {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.enumerateDevices) return;
    let cancelled = false;
    const refresh = () =>
      navigator.mediaDevices
        .enumerateDevices()
        .then((all) => {
          if (!cancelled) setDevices(all.filter((device) => device.kind === 'videoinput' && device.deviceId));
        })
        .catch(() => undefined);
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, [enabled]);
  return devices;
}

export type Tone = 'good' | 'warn' | 'bad';

export interface StatusLine {
  label: string;
  value: string;
  tone: Tone;
}

const ALIGNMENT_TEXT: Record<DetectionResult['alignment'], string> = {
  correct: 'Correct',
  off_center: 'Off centre',
  skewed: 'At an angle',
  too_close: 'Too close',
  too_far: 'Too far',
  cut_off: 'Cut off',
  unknown: 'Not found',
};

/** The calibration read-out. Every line comes from the measured result. */
export function describeResult(result: DetectionResult): StatusLine[] {
  const { screenDetected, visibilityPercentage, clarity, lighting, stability, alignment } = result;
  const goodCamera = clarity === 'good' && lighting === 'good';
  const poorCamera = clarity === 'poor' || lighting !== 'good';
  return [
    {
      label: 'Screen Visibility',
      value: `${visibilityPercentage}%`,
      tone: !screenDetected || visibilityPercentage < 70 ? 'bad' : visibilityPercentage < 95 ? 'warn' : 'good',
    },
    {
      label: 'Camera Quality',
      value: goodCamera ? 'Good' : poorCamera ? 'Poor' : 'Fair',
      tone: goodCamera ? 'good' : poorCamera ? 'bad' : 'warn',
    },
    {
      label: 'Screen Detection',
      value: screenDetected ? 'Successful' : 'Not detected',
      tone: screenDetected ? 'good' : 'bad',
    },
    {
      label: 'Positioning',
      value: ALIGNMENT_TEXT[alignment],
      tone: alignment === 'correct' ? 'good' : alignment === 'unknown' ? 'bad' : 'warn',
    },
    {
      label: 'Stability',
      value: stability === 'stable' ? 'Stable' : stability === 'moderate' ? 'Some movement' : 'Unstable',
      tone: stability === 'stable' ? 'good' : stability === 'moderate' ? 'warn' : 'bad',
    },
  ];
}
