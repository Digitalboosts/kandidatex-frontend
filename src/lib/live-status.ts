import type { ClarityLevel, DetectionResult, LightingLevel, MonitoringStatusDTO, StabilityLevel } from '@/types';
import type { AnalyzerState } from './use-stream-analyzer';

type Tone = 'good' | 'warn' | 'bad' | 'neutral';
interface Reading {
  value: string;
  tone: Tone;
}

const NOT_MEASURED: Reading = { value: '—', tone: 'neutral' };

const CLARITY: Record<ClarityLevel, Reading> = {
  good: { value: 'Good', tone: 'good' },
  fair: { value: 'Fair', tone: 'warn' },
  poor: { value: 'Poor', tone: 'bad' },
};
const LIGHTING: Record<LightingLevel, Reading> = {
  good: { value: 'Good', tone: 'good' },
  low: { value: 'Too dark', tone: 'bad' },
  high: { value: 'Too bright', tone: 'warn' },
};
const STABILITY: Record<StabilityLevel, Reading> = {
  stable: { value: 'Stable', tone: 'good' },
  moderate: { value: 'Some movement', tone: 'warn' },
  unstable: { value: 'Unstable', tone: 'bad' },
};

interface LiveStatusInput {
  hasVideo: boolean;
  analyzerState: AnalyzerState;
  liveResult: DetectionResult | null;
  status: MonitoringStatusDTO | null;
}

/**
 * Picks what the status cards show. Readings are blank rather than stale when
 * nothing is measuring the video, so the page never implies a screen is visible
 * when no video is arriving.
 */
export function deriveLiveStatus({ hasVideo, analyzerState, liveResult, status }: LiveStatusInput) {
  const blank = { screen: NOT_MEASURED, visibility: NOT_MEASURED, clarity: NOT_MEASURED, lighting: NOT_MEASURED, stability: NOT_MEASURED };

  if (!hasVideo) return { ...blank, note: 'No video is arriving, so nothing is being measured.' };

  // People without reporting rights get readings from the owner's analyzer via `status`.
  const reading = liveResult ?? (status?.source === 'stream_analysis' ? status : null);
  if (!reading) {
    const note =
      analyzerState === 'error'
        ? 'The stream analyzer could not start in this browser, so the screen is not being measured.'
        : 'Starting the stream analyzer.';
    return { ...blank, note };
  }

  const visibility = reading.visibilityPercentage;
  return {
    screen: reading.screenDetected
      ? ({ value: 'Detected', tone: 'good' } as Reading)
      : ({ value: 'Not detected', tone: 'bad' } as Reading),
    visibility: {
      value: reading.screenDetected ? `${visibility}%` : '0%',
      tone: !reading.screenDetected || visibility < 70 ? 'bad' : visibility < 80 ? 'warn' : 'good',
    } as Reading,
    clarity: CLARITY[reading.clarity],
    lighting: LIGHTING[reading.lighting],
    stability: STABILITY[reading.stability],
    note: 'Measured live from the received video with OpenCV.',
  };
}
