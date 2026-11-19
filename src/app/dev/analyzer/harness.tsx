'use client';

import type { DetectionResult } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { useStreamAnalyzer } from '@/lib/use-stream-analyzer';

type Scene = 'screen' | 'none' | 'cutoff';

function draw(context: CanvasRenderingContext2D, scene: Scene): void {
  const { width, height } = context.canvas;
  const desk = context.createLinearGradient(0, 0, 0, height);
  desk.addColorStop(0, '#6b7280');
  desk.addColorStop(1, '#8b8f97');
  context.fillStyle = desk;
  context.fillRect(0, 0, width, height);
  if (scene === 'none') return;

  const w = width * 0.68;
  const h = w / 1.6;
  const x = (width - w) / 2 - (scene === 'cutoff' ? width * 0.31 : 0);
  const y = (height - h) / 2;
  context.fillStyle = '#111827';
  context.fillRect(x - 12, y - 12, w + 24, h + 24);
  context.fillStyle = '#f3f4f6';
  context.fillRect(x, y, w, h);
  context.fillStyle = '#9ca3af';
  context.fillRect(x, y, w, h * 0.07);
  context.fillStyle = '#374151';
  for (let row = 0; row < 12; row++) {
    context.fillRect(x + w * 0.06, y + h * (0.14 + row * 0.065), w * (0.4 + 0.45 * Math.abs(Math.sin(row * 1.7))), h * 0.025);
  }
}

export function AnalyzerHarness() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState<Scene>('screen');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const state = useStreamAnalyzer(videoRef, true, setResult);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !video || !context) return;
    const timer = setInterval(() => draw(context, scene), 100);
    draw(context, scene);
    video.srcObject = canvas.captureStream(10);
    video.play().catch(() => undefined);
    return () => clearInterval(timer);
  }, [scene]);

  return (
    <main className="space-y-4 p-6">
      <div className="flex gap-2">
        {(['screen', 'none', 'cutoff'] as const).map((name) => (
          <button key={name} type="button" onClick={() => setScene(name)} data-testid={`scene-${name}`} className="rounded border px-3 py-1">
            {name}
          </button>
        ))}
      </div>
      <canvas ref={canvasRef} width={640} height={360} className="hidden" />
      <video ref={videoRef} muted playsInline className="w-96" />
      <p data-testid="analyzer-state">{state}</p>
      <pre data-testid="analyzer-result">{result ? JSON.stringify(result) : ''}</pre>
    </main>
  );
}
