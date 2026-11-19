'use client';

import { useEffect, useRef } from 'react';
import { Button, Card } from '@/components/ui';
import {
  BACK_CAMERA,
  type CameraChoice,
  FRONT_CAMERA,
  isMirrored,
  useCameraStream,
  useVideoDevices,
} from '@/lib/candidate-camera';
import { Notice, StepShell } from './candidate-ui';

/** Plays a stream in a video element. Muted and inline, so phones play it without a tap. */
export function StreamVideo({
  stream,
  mirrored,
  videoRef,
  className = '',
}: {
  stream: MediaStream | null;
  mirrored: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}) {
  const ownRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? ownRef;
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => undefined);
  }, [stream, ref]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={`absolute inset-0 size-full object-cover ${mirrored ? '-scale-x-100' : ''} ${className}`}
    />
  );
}

export function CameraSelectionStep({
  camera,
  onChange,
  onContinue,
}: {
  camera: CameraChoice;
  onChange: (choice: CameraChoice) => void;
  onContinue: () => void;
}) {
  const { stream, error, loading } = useCameraStream(camera, true);
  const devices = useVideoDevices(true);
  const options: CameraChoice[] = [
    BACK_CAMERA,
    FRONT_CAMERA,
    ...devices.map((device, index) => ({
      key: `device:${device.deviceId}`,
      title: device.label || `Camera ${index + 1}`,
      hint: 'A camera connected to this device',
      deviceId: device.deviceId,
    })),
  ];

  return (
    <StepShell>
      <Card className="p-6">
        <h1 className="text-xl font-semibold">Choose a camera</h1>
        <div className="relative mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-ink">
          <StreamVideo stream={stream} mirrored={isMirrored(camera)} />
          {!stream ? (
            <p className="relative px-4 text-center text-sm text-white">
              {error ? 'This camera isn’t available.' : loading ? 'Starting camera…' : ''}
            </p>
          ) : null}
        </div>
        <div role="radiogroup" aria-label="Camera" className="mt-4 space-y-2">
          {options.map((option) => {
            const selected = option.key === camera.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`camera-${option.key}`}
                onClick={() => onChange(option)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selected ? 'border-brand-600 bg-brand-50' : 'border-line bg-white hover:bg-canvas'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-brand-600' : 'border-ink-muted'
                  }`}
                >
                  {selected ? <span className="size-2 rounded-full bg-brand-600" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{option.title}</span>
                  <span className="block text-xs text-ink-soft">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {error ? (
          <div className="mt-4">
            <Notice text={`${error} Select another camera to continue.`} tone="warn" />
          </div>
        ) : null}
        <Button data-testid="camera-continue" className="mt-5 w-full" disabled={!stream} onClick={onContinue}>
          Continue
        </Button>
      </Card>
    </StepShell>
  );
}
