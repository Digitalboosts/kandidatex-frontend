import { createRequire } from 'node:module';
import type { Point } from '../src/types';
import { beforeAll, describe, expect, it } from 'vitest';
import { createOpenCvJsAdapter, DEFAULT_DETECTION_CONFIG, processFrame } from '../src/detection';
import { centeredScreen, renderScene, type SceneOptions } from './synth';

/* eslint-disable @typescript-eslint/no-explicit-any */
let cv: any;
let adapter: ReturnType<typeof createOpenCvJsAdapter>;

beforeAll(async () => {
  // This build of opencv.js is a thenable that resolves to itself, so awaiting
  // it (or a dynamic import of it) never settles. Use require and the init hook.
  cv = createRequire(import.meta.url)('@techstark/opencv-js');
  if (!cv.Mat) {
    await new Promise<void>((resolve) => {
      cv.onRuntimeInitialized = () => resolve();
    });
  }
  adapter = createOpenCvJsAdapter(cv);
}, 60_000);

function detect(options: SceneOptions, mirrored = false) {
  const frame = renderScene(cv, options);
  return processFrame(adapter, frame, DEFAULT_DETECTION_CONFIG, null, { mirrored });
}

/** Maps a clean centred quad by moving its corners, to simulate a tilted view. */
function tilted(amount: number): Point[] {
  const [a, b, c, d] = centeredScreen() as [Point, Point, Point, Point];
  return [
    { x: a.x, y: a.y + amount },
    b,
    c,
    { x: d.x, y: d.y - amount },
  ];
}

describe('screen detection on rendered scenes (real OpenCV)', () => {
  it('finds a well-positioned screen and scores it highly', () => {
    const { result } = detect({ screen: centeredScreen() });
    expect(result.screenDetected).toBe(true);
    expect(result.cornersDetected).toBe(4);
    expect(result.alignment).toBe('correct');
    expect(result.visibilityPercentage).toBeGreaterThanOrEqual(95);
    expect(result.readinessScore).toBeGreaterThanOrEqual(85);
    expect(result.instructions).toEqual(['properly_positioned']);
  });

  it('finds a dark-themed screen too', () => {
    const { result } = detect({ screen: centeredScreen(), theme: 'dark' });
    expect(result.screenDetected).toBe(true);
    expect(result.cornersDetected).toBe(4);
  });

  it('locates the corners close to where they were drawn', () => {
    const screen = centeredScreen();
    const { result } = detect({ screen });
    expect(result.corners).toHaveLength(4);
    // Within about 2% of the frame width: the display, not the lid around it.
    result.corners.forEach((corner, index) => {
      expect(Math.abs(corner.x * 640 - screen[index]!.x)).toBeLessThan(13);
      expect(Math.abs(corner.y * 360 - screen[index]!.y)).toBeLessThan(13);
    });
  });

  it('never reports a screen, or a high score, on a scene with no screen', () => {
    const { result } = detect({ screen: null });
    expect(result.screenDetected).toBe(false);
    expect(result.cornersDetected).toBe(0);
    expect(result.visibilityPercentage).toBe(0);
    expect(result.readinessScore).toBeLessThanOrEqual(30);
    expect(result.instructions).toContain('point_at_screen');
  });

  it('ignores a small rectangle that is too small and a square one with the wrong shape', () => {
    const smallAndSquare = detect({
      screen: null,
      distractors: [
        { points: [{ x: 40, y: 40 }, { x: 110, y: 40 }, { x: 110, y: 85 }, { x: 40, y: 85 }], value: 230 },
        { points: [{ x: 300, y: 90 }, { x: 460, y: 90 }, { x: 460, y: 250 }, { x: 300, y: 250 }], value: 230 },
      ],
    });
    expect(smallAndSquare.result.screenDetected).toBe(false);
  });

  it('prefers the screen over a small rectangle next to it', () => {
    const { result } = detect({
      screen: centeredScreen(640, 360, 0.6),
      distractors: [{ points: [{ x: 10, y: 10 }, { x: 80, y: 10 }, { x: 80, y: 55 }, { x: 10, y: 55 }], value: 230 }],
    });
    expect(result.screenDetected).toBe(true);
    expect(result.metrics.areaFraction).toBeGreaterThan(0.2);
  });

  it('reports a screen cut off on the left and asks to move left', () => {
    const { result } = detect({ screen: centeredScreen(640, 360, 0.68, -200) });
    expect(result.screenDetected).toBe(true);
    expect(result.cutOffSides).toContain('left');
    expect(result.cornersDetected).toBeLessThan(4);
    expect(result.visibilityPercentage).toBeLessThan(90);
    expect(result.alignment).toBe('cut_off');
    expect(result.instructions).toContain('move_left');
    expect(result.readinessScore).toBeLessThan(80);
  });

  it('reports a dark-themed screen cut off at the bottom', () => {
    const { result } = detect({ screen: centeredScreen(640, 360, 0.68, 0, 90), theme: 'dark' });
    expect(result.screenDetected).toBe(true);
    expect(result.cutOffSides).toContain('bottom');
    expect(result.instructions).toContain('move_down');
    expect(result.readinessScore).toBeLessThan(80);
  });

  it('asks to move right when cut off on the right, and swaps sides for a mirrored camera', () => {
    const screen = centeredScreen(640, 360, 0.68, 200);
    expect(detect({ screen }).result.instructions).toContain('move_right');
    expect(detect({ screen }, true).result.instructions).toContain('move_left');
  });

  it('asks to move closer when the screen is small', () => {
    const { result } = detect({ screen: centeredScreen(640, 360, 0.4) });
    expect(result.alignment).toBe('too_far');
    expect(result.instructions).toContain('move_closer');
  });

  it('asks to move farther when the screen overflows the frame', () => {
    const { result } = detect({ screen: centeredScreen(640, 360, 1.3) });
    expect(result.instructions).not.toContain('properly_positioned');
    if (result.screenDetected) expect(result.alignment).toBe('too_close');
    expect(result.readinessScore).toBeLessThan(80);
  });

  it('asks to centre an off-centre screen', () => {
    const { result } = detect({ screen: centeredScreen(640, 360, 0.6, 105) });
    expect(result.alignment).toBe('off_center');
    expect(result.instructions).toContain('move_right');
  });

  it('flags a strongly tilted view', () => {
    const { result } = detect({ screen: tilted(70) });
    expect(result.screenDetected).toBe(true);
    expect(result.metrics.perspectiveDistortion).toBeGreaterThan(0.2);
    expect(result.alignment).toBe('skewed');
    expect(result.instructions).toContain('correct_angle');
  });

  it('detects blur from Laplacian variance', () => {
    const sharp = detect({ screen: centeredScreen() }).result;
    const soft = detect({ screen: centeredScreen(), blur: 15 }).result;
    const heavy = detect({ screen: centeredScreen(), blur: 31 }).result;
    expect(sharp.clarity).toBe('good');
    expect(soft.clarity).toBe('fair');
    expect(heavy.clarity).toBe('poor');
    expect(soft.readinessScore).toBeLessThan(sharp.readinessScore);
    expect(heavy.readinessScore).toBeLessThan(soft.readinessScore);
    expect(heavy.instructions).toContain('improve_focus');
  });

  it('detects poor lighting', () => {
    const { result } = detect({ screen: centeredScreen(), exposure: 0.15 });
    expect(result.lighting).toBe('low');
    expect(result.instructions).toContain('increase_lighting');
    expect(result.scoreBreakdown.lighting).toBeLessThan(5);
  });

  it('reads no movement between two frames of a still camera', () => {
    const first = processFrame(adapter, renderScene(cv, { screen: centeredScreen(), seed: 1 }), DEFAULT_DETECTION_CONFIG, null);
    const second = processFrame(adapter, renderScene(cv, { screen: centeredScreen(), seed: 2 }), DEFAULT_DETECTION_CONFIG, first.state);
    expect(second.result.stability).toBe('stable');
  });

  it('detects camera movement between frames', () => {
    const first = processFrame(adapter, renderScene(cv, { screen: centeredScreen() }), DEFAULT_DETECTION_CONFIG, null);
    const second = processFrame(
      adapter,
      renderScene(cv, { screen: centeredScreen(640, 360, 0.68, 40, 12) }),
      DEFAULT_DETECTION_CONFIG,
      first.state,
    );
    expect(second.result.stability).toBe('unstable');
    expect(second.result.instructions[0]).toBe('hold_steady');
  });

  it('does not leak Mats across many frames', () => {
    const frame = renderScene(cv, { screen: centeredScreen() });
    processFrame(adapter, frame, DEFAULT_DETECTION_CONFIG, null);
    const before = cv.HEAP8.length;
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = processFrame(adapter, frame, DEFAULT_DETECTION_CONFIG, state).state;
    }
    expect(cv.HEAP8.length).toBe(before);
  });

  it('handles a stride wider than the frame', () => {
    const frame = renderScene(cv, { screen: centeredScreen() });
    const stride = frame.width + 32;
    const padded = new Uint8Array(stride * frame.height);
    for (let y = 0; y < frame.height; y++) {
      padded.set(frame.data.subarray(y * frame.width, (y + 1) * frame.width), y * stride);
    }
    const { result } = processFrame(
      adapter,
      { data: padded, width: frame.width, height: frame.height, stride },
      DEFAULT_DETECTION_CONFIG,
      null,
    );
    expect(result.screenDetected).toBe(true);
    expect(result.cornersDetected).toBe(4);
  });
});
