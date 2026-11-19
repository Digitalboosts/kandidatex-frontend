import type { Point } from '../types';

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function centroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (let i = 0; i < points.length; i++) {
    x += points[i]!.x;
    y += points[i]!.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** Orders a convex polygon clockwise (in image coordinates), starting at the top-left vertex. */
export function orderClockwise(points: Point[]): Point[] {
  const center = centroid(points);
  const sorted = points
    .slice()
    .sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  let start = 0;
  let best = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const sum = sorted[i]!.x + sorted[i]!.y;
    if (sum < best) {
      best = sum;
      start = i;
    }
  }
  const ordered: Point[] = [];
  for (let i = 0; i < sorted.length; i++) {
    ordered.push(sorted[(start + i) % sorted.length]!);
  }
  return ordered;
}

/** Interior angle at `b` in degrees. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const denominator = Math.sqrt(abx * abx + aby * aby) * Math.sqrt(cbx * cbx + cby * cby);
  if (denominator === 0) return 0;
  const cosine = (abx * cbx + aby * cby) / denominator;
  return (Math.acos(cosine < -1 ? -1 : cosine > 1 ? 1 : cosine) * 180) / Math.PI;
}

export function isConvex(points: Point[]): boolean {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const c = points[(i + 2) % points.length]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      const current = cross > 0 ? 1 : -1;
      if (sign !== 0 && current !== sign) return false;
      sign = current;
    }
  }
  return true;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}
