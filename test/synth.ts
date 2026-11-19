import type { Point } from '../src/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SceneOptions {
  width?: number;
  height?: number;
  /** Display corners in pixels, clockwise from top-left. */
  screen?: Point[] | null;
  /** Brightness multiplier for the whole scene. */
  exposure?: number;
  /** Gaussian blur kernel applied to the whole scene (0 = none). */
  blur?: number;
  /** Extra rectangles drawn on the desk (books, paper), as filled polygons. */
  distractors?: { points: Point[]; value: number }[];
  /** 'light' UI on a bright display, 'dark' IDE-like UI on a dark display. */
  theme?: 'light' | 'dark';
  seed?: number;
  /** Shifts the laptop body with the screen for movement tests. */
}

function fillPolygon(cv: any, mat: any, points: Point[], value: number): void {
  const flat: number[] = [];
  for (const point of points) flat.push(Math.round(point.x), Math.round(point.y));
  const polygon = cv.matFromArray(points.length, 1, cv.CV_32SC2, flat);
  const list = new cv.MatVector();
  list.push_back(polygon);
  cv.fillPoly(mat, list, new cv.Scalar(value));
  list.delete();
  polygon.delete();
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Maps a point in unit display space onto the display quad. */
function onQuad(quad: Point[], u: number, v: number): Point {
  return lerp(lerp(quad[0]!, quad[1]!, u), lerp(quad[3]!, quad[2]!, u), v);
}

/** Grows a quad outward from its centre, used for the bezel and lid. */
function grow(quad: Point[], factor: number): Point[] {
  const cx = quad.reduce((sum, p) => sum + p.x, 0) / quad.length;
  const cy = quad.reduce((sum, p) => sum + p.y, 0) / quad.length;
  return quad.map((p) => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
}

/**
 * Renders a grayscale desk scene: textured background, laptop lid and bezel,
 * and a display showing a window with text-like rows, then sensor noise. These
 * are synthetic stand-ins for camera footage, not photographs.
 */
export function renderScene(cv: any, options: SceneOptions = {}): { data: Uint8Array; width: number; height: number } {
  const width = options.width ?? 640;
  const height = options.height ?? 360;
  const scene = new cv.Mat(height, width, cv.CV_8UC1, new cv.Scalar(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      scene.data[y * width + x] = 95 + (35 * y) / height + 10 * Math.sin(x / 40);
    }
  }

  for (const distractor of options.distractors ?? []) {
    fillPolygon(cv, scene, distractor.points, distractor.value);
  }

  if (options.screen) {
    const quad = options.screen;
    const theme = options.theme ?? 'light';
    fillPolygon(cv, scene, grow(quad, 1.05), 28);
    fillPolygon(cv, scene, quad, theme === 'light' ? 225 : 38);

    const ink = theme === 'light' ? 70 : 190;
    fillPolygon(cv, scene, [onQuad(quad, 0, 0), onQuad(quad, 1, 0), onQuad(quad, 1, 0.07), onQuad(quad, 0, 0.07)], theme === 'light' ? 170 : 70);
    for (let row = 0; row < 14; row++) {
      const v = 0.13 + row * 0.058;
      const length = 0.35 + 0.5 * Math.abs(Math.sin(row * 1.7));
      fillPolygon(
        cv,
        scene,
        [onQuad(quad, 0.06, v), onQuad(quad, 0.06 + length, v), onQuad(quad, 0.06 + length, v + 0.022), onQuad(quad, 0.06, v + 0.022)],
        ink,
      );
    }
  }

  if (options.blur) {
    const kernel = options.blur % 2 === 0 ? options.blur + 1 : options.blur;
    cv.GaussianBlur(scene, scene, new cv.Size(kernel, kernel), 0);
  }

  // Deterministic sensor noise and exposure.
  let state = (options.seed ?? 7) >>> 0;
  const exposure = options.exposure ?? 1;
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const noise = ((state >>> 24) / 255 - 0.5) * 6;
    data[i] = Math.max(0, Math.min(255, Math.round(scene.data[i] * exposure + noise)));
  }
  scene.delete();
  return { data, width, height };
}

/** A centred, fronto-parallel 16:10 display covering `fill` of the frame width. */
export function centeredScreen(width = 640, height = 360, fill = 0.68, dx = 0, dy = 0): Point[] {
  const w = width * fill;
  const h = w / 1.6;
  const left = (width - w) / 2 + dx;
  const top = (height - h) / 2 + dy;
  return [
    { x: left, y: top },
    { x: left + w, y: top },
    { x: left + w, y: top + h },
    { x: left, y: top + h },
  ];
}
