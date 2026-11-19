import { describe, expect, it } from 'vitest';
import {
  analyzeMeasurements,
  createResultSmoother,
  DEFAULT_DETECTION_CONFIG as config,
  isReadyToContinue,
  evaluateContour,
  perspectiveDistortion,
  SCORE_WEIGHTS,
  type ScreenCandidate,
} from '../src/detection';

const frame = { width: 360, height: 203 };

const quad = [
  { x: 60, y: 30 },
  { x: 300, y: 30 },
  { x: 300, y: 175 },
  { x: 60, y: 175 },
];

const goodScreen: ScreenCandidate = {
  polygon: quad,
  visibleCorners: quad,
  cutOffSides: [],
  rectangularity: 0.98,
  visibility: 100,
  distortion: 0,
  minX: 60,
  minY: 30,
  maxX: 300,
  maxY: 175,
};

const goodInput = {
  frame,
  brightness: 150,
  laplacianVariance: 600,
  movement: 0,
  screen: goodScreen,
  mirrored: false,
};

describe('readiness score', () => {
  it('uses the weights from the spec', () => {
    expect(SCORE_WEIGHTS).toEqual({ boundary: 25, corners: 25, positioning: 20, clarity: 15, lighting: 10, stability: 5 });
  });

  it('reaches 100 only when every measurement is good', () => {
    expect(analyzeMeasurements(goodInput, config).readinessScore).toBe(100);
  });

  it('cannot exceed the non-screen components without a detected screen', () => {
    const result = analyzeMeasurements({ ...goodInput, screen: null }, config);
    expect(result.readinessScore).toBe(30);
    expect(result.screenDetected).toBe(false);
    expect(result.visibilityPercentage).toBe(0);
    expect(result.scoreBreakdown.boundary).toBe(0);
    expect(result.scoreBreakdown.corners).toBe(0);
    expect(result.scoreBreakdown.positioning).toBe(0);
  });

  it('removes each component when its measurement is at its worst', () => {
    expect(analyzeMeasurements({ ...goodInput, laplacianVariance: 0 }, config).readinessScore).toBe(85);
    expect(analyzeMeasurements({ ...goodInput, brightness: 10 }, config).readinessScore).toBe(90);
    expect(analyzeMeasurements({ ...goodInput, brightness: 250 }, config).readinessScore).toBe(90);
    expect(analyzeMeasurements({ ...goodInput, movement: 1 }, config).readinessScore).toBe(95);
  });
});

describe('readiness gate', () => {
  it('passes a good result', () => {
    expect(isReadyToContinue(analyzeMeasurements(goodInput, config), 80)).toBe(true);
  });

  it('respects the configured threshold', () => {
    const result = analyzeMeasurements({ ...goodInput, laplacianVariance: 0 }, config);
    expect(result.readinessScore).toBe(85);
    expect(isReadyToContinue({ ...result, clarity: 'fair' }, 90)).toBe(false);
    expect(isReadyToContinue({ ...result, clarity: 'fair' }, 80)).toBe(true);
  });

  it('blocks a badly blurred image even when the score clears the threshold', () => {
    const result = analyzeMeasurements({ ...goodInput, laplacianVariance: 0 }, config);
    expect(result.readinessScore).toBeGreaterThanOrEqual(80);
    expect(isReadyToContinue(result, 80)).toBe(false);
  });

  it('blocks when no screen is detected', () => {
    expect(isReadyToContinue(analyzeMeasurements({ ...goodInput, screen: null }, config), 0)).toBe(false);
  });
});

describe('contour filtering', () => {
  const contour = (polygon: { x: number; y: number }[], area: number) => ({ polygon, area });

  it('accepts a laptop-shaped quad', () => {
    expect(evaluateContour(contour(quad, 240 * 145), frame, config)).not.toBeNull();
  });

  it('rejects the frame itself', () => {
    const whole = [
      { x: 0, y: 0 },
      { x: 359, y: 0 },
      { x: 359, y: 202 },
      { x: 0, y: 202 },
    ];
    expect(evaluateContour(contour(whole, 359 * 202), frame, config)).toBeNull();
  });

  it('rejects wrong aspect ratios', () => {
    const square = [
      { x: 100, y: 30 },
      { x: 250, y: 30 },
      { x: 250, y: 180 },
      { x: 100, y: 180 },
    ];
    expect(evaluateContour(contour(square, 150 * 150), frame, config)).toBeNull();
    const sliver = [
      { x: 10, y: 80 },
      { x: 350, y: 80 },
      { x: 350, y: 120 },
      { x: 10, y: 120 },
    ];
    expect(evaluateContour(contour(sliver, 340 * 40), frame, config)).toBeNull();
  });

  it('rejects non-rectangular corners', () => {
    const slanted = [
      { x: 150, y: 30 },
      { x: 320, y: 30 },
      { x: 210, y: 175 },
      { x: 40, y: 175 },
    ];
    expect(evaluateContour(contour(slanted, 170 * 145), frame, config)).toBeNull();
  });

  it('rejects a polygon its contour barely fills', () => {
    expect(evaluateContour(contour(quad, 240 * 145 * 0.5), frame, config)).toBeNull();
  });

  it('caps a cut-off screen below 100% visibility', () => {
    const clipped = [
      { x: 0, y: 30 },
      { x: 240, y: 30 },
      { x: 240, y: 175 },
      { x: 0, y: 175 },
    ];
    const candidate = evaluateContour(contour(clipped, 240 * 145), frame, config);
    expect(candidate?.cutOffSides).toEqual(['left']);
    expect(candidate?.visibleCorners).toHaveLength(2);
    expect(candidate!.visibility).toBeLessThanOrEqual(95);
  });
});

describe('perspective distortion', () => {
  it('is zero head-on and grows with tilt', () => {
    expect(perspectiveDistortion(quad)).toBeCloseTo(0, 5);
    const tilted = [
      { x: 60, y: 60 },
      { x: 300, y: 30 },
      { x: 300, y: 175 },
      { x: 60, y: 145 },
    ];
    expect(perspectiveDistortion(tilted)).toBeGreaterThan(0.3);
  });
});

describe('result smoothing', () => {
  const base = analyzeMeasurements(goodInput, config);
  const lost = analyzeMeasurements({ ...goodInput, screen: null }, config);

  it('ignores a single bad frame', () => {
    const smooth = createResultSmoother(3);
    smooth(base);
    smooth(base);
    expect(smooth(lost).screenDetected).toBe(true);
  });

  it('returns a frame that was really measured, never a blend', () => {
    const clippedScreen: ScreenCandidate = { ...goodScreen, cutOffSides: ['left'], visibility: 60 };
    const clipped = analyzeMeasurements({ ...goodInput, screen: clippedScreen }, config);
    const smooth = createResultSmoother(3);
    smooth(base);
    smooth(base);
    const output = smooth(clipped);
    expect([base, clipped]).toContainEqual(output);
    expect(output.cutOffSides.length > 0).toBe(output.visibilityPercentage < 100);
  });

  it('follows a sustained change', () => {
    const smooth = createResultSmoother(3);
    smooth(base);
    smooth(lost);
    const result = smooth(lost);
    expect(result.screenDetected).toBe(false);
    expect(result.visibilityPercentage).toBe(0);
  });
});
