import type {
  AlignmentLevel,
  ClarityLevel,
  DetectionResult,
  FrameSide,
  InstructionCode,
  LightingLevel,
  Point,
  ScoreBreakdown,
  StabilityLevel,
} from '../types';
import type { DetectionConfig } from './config';
import type { PolygonContour } from './cv-adapter';
import { angleAt, centroid, clamp01, distance, isConvex, orderClockwise, pointInPolygon, polygonArea } from './geometry';

/** The weights from the product spec. They sum to 100. */
export const SCORE_WEIGHTS: ScoreBreakdown = {
  boundary: 25,
  corners: 25,
  positioning: 20,
  clarity: 15,
  lighting: 10,
  stability: 5,
};

export interface ScreenCandidate {
  /** Polygon in processing-frame pixels, clockwise from top-left. */
  polygon: Point[];
  visibleCorners: Point[];
  cutOffSides: FrameSide[];
  rectangularity: number;
  visibility: number;
  distortion: number;
  /** Bounding box in processing-frame pixels. */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface FrameSize {
  width: number;
  height: number;
}

function sidesTouched(point: Point, frame: FrameSize, margin: number): FrameSide[] {
  const sides: FrameSide[] = [];
  if (point.x <= margin) sides.push('left');
  if (point.x >= frame.width - 1 - margin) sides.push('right');
  if (point.y <= margin) sides.push('top');
  if (point.y >= frame.height - 1 - margin) sides.push('bottom');
  return sides;
}

/** Perspective distortion of a four-corner polygon: 0 is head-on, 1 is extreme. */
export function perspectiveDistortion(quad: Point[]): number {
  if (quad.length !== 4) return 0;
  const [a, b, c, d] = quad as [Point, Point, Point, Point];
  const top = distance(a, b);
  const right = distance(b, c);
  const bottom = distance(c, d);
  const left = distance(d, a);
  const horizontal = 1 - Math.min(top, bottom) / Math.max(top, bottom, 1e-6);
  const vertical = 1 - Math.min(left, right) / Math.max(left, right, 1e-6);
  let angleDeviation = 0;
  for (let i = 0; i < 4; i++) {
    const angle = angleAt(quad[(i + 3) % 4]!, quad[i]!, quad[(i + 1) % 4]!);
    angleDeviation = Math.max(angleDeviation, Math.abs(angle - 90) / 45);
  }
  return clamp01(Math.max(horizontal, vertical, angleDeviation));
}

/**
 * Estimates how much of a cut-off screen is inside the frame, assuming the
 * configured aspect ratio. This is an estimate, capped below 100 because a
 * clipped screen is by definition not fully visible.
 */
function estimateClippedVisibility(
  visibleWidth: number,
  visibleHeight: number,
  cutOffSides: FrameSide[],
  config: DetectionConfig,
): number {
  const clippedX = cutOffSides.indexOf('left') >= 0 || cutOffSides.indexOf('right') >= 0;
  const clippedY = cutOffSides.indexOf('top') >= 0 || cutOffSides.indexOf('bottom') >= 0;
  let fraction = 0.5;
  if (clippedX && !clippedY) {
    fraction = visibleWidth / (visibleHeight * config.expectedAspectRatio);
  } else if (clippedY && !clippedX) {
    fraction = visibleHeight / (visibleWidth / config.expectedAspectRatio);
  }
  return Math.min(95, Math.round(clamp01(fraction) * 100));
}

/** Turns a contour into a screen candidate, or null if it isn't plausibly a screen. */
export function evaluateContour(
  contour: PolygonContour,
  frame: FrameSize,
  config: DetectionConfig,
): ScreenCandidate | null {
  const polygon = orderClockwise(contour.polygon);
  if (polygon.length < 3 || !isConvex(polygon)) return null;

  const margin = Math.max(3, Math.min(frame.width, frame.height) * config.borderMarginFraction);
  const visibleCorners: Point[] = [];
  const sideHits: Record<FrameSide, number> = { left: 0, right: 0, top: 0, bottom: 0 };
  for (let i = 0; i < polygon.length; i++) {
    const touched = sidesTouched(polygon[i]!, frame, margin);
    if (touched.length === 0) visibleCorners.push(polygon[i]!);
    for (let j = 0; j < touched.length; j++) sideHits[touched[j]!] += 1;
  }
  if (visibleCorners.length < config.minVisibleCorners) return null;
  // Any more real corners than four means this isn't a rectangle seen in one piece.
  if (visibleCorners.length > 4) return null;

  const cutOffSides: FrameSide[] = [];
  const sides: FrameSide[] = ['left', 'right', 'top', 'bottom'];
  for (let i = 0; i < sides.length; i++) {
    if (sideHits[sides[i]!] > 0) cutOffSides.push(sides[i]!);
  }
  const clipped = cutOffSides.length > 0;
  if (!clipped && polygon.length !== 4) return null;

  for (let i = 0; i < polygon.length; i++) {
    const vertex = polygon[i]!;
    if (sidesTouched(vertex, frame, margin).length > 0) continue;
    const angle = angleAt(polygon[(i + polygon.length - 1) % polygon.length]!, vertex, polygon[(i + 1) % polygon.length]!);
    if (angle < config.minCornerAngle || angle > config.maxCornerAngle) return null;
  }

  const area = polygonArea(polygon);
  if (area <= 0) return null;
  const rectangularity = contour.area / area;
  if (rectangularity < config.minRectangularity) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < polygon.length; i++) {
    minX = Math.min(minX, polygon[i]!.x);
    minY = Math.min(minY, polygon[i]!.y);
    maxX = Math.max(maxX, polygon[i]!.x);
    maxY = Math.max(maxY, polygon[i]!.y);
  }

  let visibility: number;
  let distortion = 0;
  if (clipped) {
    visibility = estimateClippedVisibility(maxX - minX, maxY - minY, cutOffSides, config);
  } else {
    const [a, b, c, d] = polygon as [Point, Point, Point, Point];
    const width = (distance(a, b) + distance(d, c)) / 2;
    const height = (distance(a, d) + distance(b, c)) / 2;
    const aspect = width / Math.max(height, 1e-6);
    if (aspect < config.minAspectRatio || aspect > config.maxAspectRatio) return null;
    distortion = perspectiveDistortion(polygon);
    visibility = Math.round(clamp01(rectangularity / config.fullRectangularity) * 100);
  }

  return {
    polygon,
    visibleCorners,
    cutOffSides,
    rectangularity,
    visibility,
    distortion,
    minX,
    minY,
    maxX,
    maxY,
  };
}

/** Mean brightness difference between the inside and outside of a polygon, from a thumbnail. */
export function interiorContrast(
  polygon: Point[],
  frame: FrameSize,
  thumbnail: Uint8Array,
  thumbnailWidth: number,
  thumbnailHeight: number,
): number | null {
  let inside = 0;
  let insideCount = 0;
  let outside = 0;
  let outsideCount = 0;
  for (let y = 0; y < thumbnailHeight; y++) {
    for (let x = 0; x < thumbnailWidth; x++) {
      const sample = {
        x: ((x + 0.5) / thumbnailWidth) * frame.width,
        y: ((y + 0.5) / thumbnailHeight) * frame.height,
      };
      const value = thumbnail[y * thumbnailWidth + x]!;
      if (pointInPolygon(sample, polygon)) {
        inside += value;
        insideCount++;
      } else {
        outside += value;
        outsideCount++;
      }
    }
  }
  if (insideCount === 0 || outsideCount === 0) return null;
  return Math.abs(inside / insideCount - outside / outsideCount);
}

/**
 * Picks the most plausible screen. Fully visible candidates beat cut-off ones
 * only through area and corner count, so a large clipped screen still wins over
 * a small rectangle elsewhere in the frame.
 */
export function selectScreen(
  contours: PolygonContour[],
  frame: FrameSize,
  thumbnail: Uint8Array,
  config: DetectionConfig,
): ScreenCandidate | null {
  const frameArea = frame.width * frame.height;
  const accepted: ScreenCandidate[] = [];
  let best: ScreenCandidate | null = null;
  let bestScore = 0;
  for (let i = 0; i < contours.length; i++) {
    const candidate = evaluateContour(contours[i]!, frame, config);
    if (!candidate) continue;
    const contrast = interiorContrast(
      candidate.polygon,
      frame,
      thumbnail,
      config.thumbnailWidth,
      config.thumbnailHeight,
    );
    if (contrast !== null && contrast < config.minInteriorContrast) continue;
    accepted.push(candidate);
    const areaFraction = polygonArea(candidate.polygon) / frameArea;
    const score = areaFraction * candidate.rectangularity * (candidate.visibleCorners.length / 4);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best) return null;

  // The lid and the display inside it are both good rectangles and the lid is
  // bigger, so step inward to the smallest candidate nested in the winner.
  const bestArea = polygonArea(best.polygon);
  let innermost: ScreenCandidate = best;
  let innermostArea = bestArea;
  for (let i = 0; i < accepted.length; i++) {
    const candidate = accepted[i]!;
    const area = polygonArea(candidate.polygon);
    const nested =
      candidate.minX >= best.minX - 2 &&
      candidate.minY >= best.minY - 2 &&
      candidate.maxX <= best.maxX + 2 &&
      candidate.maxY <= best.maxY + 2;
    if (
      nested &&
      area < innermostArea &&
      area >= bestArea * config.nestedAreaRatio &&
      candidate.visibleCorners.length >= best.visibleCorners.length
    ) {
      innermost = candidate;
      innermostArea = area;
    }
  }
  return innermost;
}

export interface FrameMeasurements {
  frame: FrameSize;
  brightness: number;
  laplacianVariance: number;
  movement: number;
  screen: ScreenCandidate | null;
  /** Swaps left and right guidance for the front camera. */
  mirrored: boolean;
}

function ramp(value: number, zeroAt: number, fullAt: number): number {
  return clamp01((value - zeroAt) / (fullAt - zeroAt));
}

export function classifyClarity(variance: number, config: DetectionConfig): ClarityLevel {
  if (variance >= config.clarityGood) return 'good';
  return variance >= config.clarityFair ? 'fair' : 'poor';
}

export function classifyLighting(brightness: number, config: DetectionConfig): LightingLevel {
  if (brightness < config.goodBrightnessLow) return 'low';
  return brightness > config.goodBrightnessHigh ? 'high' : 'good';
}

export function classifyStability(movement: number, config: DetectionConfig): StabilityLevel {
  if (movement <= config.stableMovement) return 'stable';
  return movement <= config.unstableMovement ? 'moderate' : 'unstable';
}

/** Combines measurements into the structured result, score and guidance for one frame. */
export function analyzeMeasurements(input: FrameMeasurements, config: DetectionConfig): DetectionResult {
  const { frame, brightness, laplacianVariance, movement, screen, mirrored } = input;
  const clarity = classifyClarity(laplacianVariance, config);
  const lighting = classifyLighting(brightness, config);
  const stability = classifyStability(movement, config);

  let alignment: AlignmentLevel = 'unknown';
  let offsetX = 0;
  let offsetY = 0;
  let fill = 0;
  let areaFraction = 0;
  let positioning = 0;

  if (screen) {
    const center = centroid(screen.polygon);
    offsetX = center.x / frame.width - 0.5;
    offsetY = center.y / frame.height - 0.5;
    fill = Math.max((screen.maxX - screen.minX) / frame.width, (screen.maxY - screen.minY) / frame.height);
    areaFraction = polygonArea(screen.polygon) / (frame.width * frame.height);

    const clippedX = screen.cutOffSides.indexOf('left') >= 0 && screen.cutOffSides.indexOf('right') >= 0;
    const clippedY = screen.cutOffSides.indexOf('top') >= 0 && screen.cutOffSides.indexOf('bottom') >= 0;
    if (clippedX || clippedY || fill >= config.tooCloseFill) {
      alignment = 'too_close';
    } else if (screen.cutOffSides.length > 0) {
      alignment = 'cut_off';
    } else if (fill < config.tooFarFill) {
      alignment = 'too_far';
    } else if (Math.abs(offsetX) > config.centerTolerance || Math.abs(offsetY) > config.centerTolerance) {
      alignment = 'off_center';
    } else if (screen.distortion > config.perspectiveTolerance) {
      alignment = 'skewed';
    } else {
      alignment = 'correct';
    }

    const offsetRange = config.maxOffset - config.centerTolerance;
    const offsetFactor =
      1 - clamp01((Math.max(Math.abs(offsetX), Math.abs(offsetY)) - config.centerTolerance) / offsetRange);
    const distortionFactor =
      1 - clamp01((screen.distortion - config.perspectiveTolerance) / (config.maxPerspective - config.perspectiveTolerance));
    const sizeFactor = clamp01(fill / config.tooFarFill);
    const clipFactor = screen.cutOffSides.length > 0 ? screen.visibility / 100 : 1;
    positioning = offsetFactor * distortionFactor * sizeFactor * clipFactor;
  }

  const boundaryConfidence = screen
    ? ramp(screen.rectangularity, config.minRectangularity - 0.1, config.fullRectangularity) * (screen.visibility / 100)
    : 0;
  const lightingFactor =
    brightness < config.goodBrightnessLow
      ? ramp(brightness, config.minBrightness, config.goodBrightnessLow)
      : 1 - ramp(brightness, config.goodBrightnessHigh, config.maxBrightness);

  const scoreBreakdown: ScoreBreakdown = {
    boundary: SCORE_WEIGHTS.boundary * boundaryConfidence,
    corners: SCORE_WEIGHTS.corners * (screen ? Math.min(screen.visibleCorners.length, 4) / 4 : 0),
    positioning: SCORE_WEIGHTS.positioning * positioning,
    clarity: SCORE_WEIGHTS.clarity * ramp(laplacianVariance, config.clarityFair / 2, config.clarityGood),
    lighting: SCORE_WEIGHTS.lighting * lightingFactor,
    stability: SCORE_WEIGHTS.stability * (1 - ramp(movement, config.stableMovement, config.unstableMovement)),
  };
  const readinessScore = Math.round(
    scoreBreakdown.boundary +
      scoreBreakdown.corners +
      scoreBreakdown.positioning +
      scoreBreakdown.clarity +
      scoreBreakdown.lighting +
      scoreBreakdown.stability,
  );

  const instructions: InstructionCode[] = [];
  if (stability === 'unstable') instructions.push('hold_steady');
  if (lighting === 'low') instructions.push('increase_lighting');
  if (lighting === 'high') instructions.push('reduce_glare');
  if (!screen) {
    instructions.push('point_at_screen');
  } else {
    const left: InstructionCode = mirrored ? 'move_right' : 'move_left';
    const right: InstructionCode = mirrored ? 'move_left' : 'move_right';
    if (alignment === 'too_close') {
      instructions.push('move_farther');
    } else if (alignment === 'cut_off') {
      if (screen.cutOffSides.indexOf('left') >= 0) instructions.push(left);
      if (screen.cutOffSides.indexOf('right') >= 0) instructions.push(right);
      if (screen.cutOffSides.indexOf('top') >= 0) instructions.push('move_up');
      if (screen.cutOffSides.indexOf('bottom') >= 0) instructions.push('move_down');
    } else if (alignment === 'too_far') {
      instructions.push('move_closer');
    } else if (alignment === 'off_center') {
      if (Math.abs(offsetX) > config.centerTolerance) instructions.push(offsetX < 0 ? left : right);
      if (Math.abs(offsetY) > config.centerTolerance) instructions.push(offsetY < 0 ? 'move_up' : 'move_down');
    } else if (alignment === 'skewed') {
      instructions.push('correct_angle');
    }
  }
  if (clarity === 'poor') instructions.push('improve_focus');
  if (instructions.length === 0) instructions.push('properly_positioned');

  const corners: Point[] = [];
  if (screen) {
    for (let i = 0; i < screen.polygon.length; i++) {
      corners.push({ x: screen.polygon[i]!.x / frame.width, y: screen.polygon[i]!.y / frame.height });
    }
  }

  return {
    screenDetected: screen !== null,
    cornersDetected: screen ? screen.visibleCorners.length : 0,
    visibilityPercentage: screen ? screen.visibility : 0,
    clarity,
    lighting,
    stability,
    alignment,
    readinessScore,
    instructions,
    corners,
    cutOffSides: screen ? screen.cutOffSides : [],
    scoreBreakdown,
    metrics: {
      brightness,
      laplacianVariance,
      movement,
      perspectiveDistortion: screen ? screen.distortion : 0,
      areaFraction,
      offsetX,
      offsetY,
    },
  };
}
