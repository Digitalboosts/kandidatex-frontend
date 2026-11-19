import type { DetectionResult, Point } from '../types';
import { analyzeMeasurements, type FrameMeasurements, type ScreenCandidate, selectScreen } from './analysis';
import type { DetectionConfig } from './config';
import type { CvAdapter, GrayFrame, PolygonContour } from './cv-adapter';
import { distance } from './geometry';

/** What one frame needs to remember about the previous frame to measure movement. */
export interface DetectionState {
  thumbnail: number[];
  /** Normalized corners, present only when all four were visible. */
  corners: Point[] | null;
}

export interface ProcessFrameOptions {
  mirrored?: boolean;
}

/** Mean absolute thumbnail difference, 0..1. */
function thumbnailDifference(previous: number[], current: Uint8Array): number {
  if (previous.length !== current.length || current.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < current.length; i++) {
    sum += Math.abs(previous[i]! - current[i]!);
  }
  return sum / current.length / 255;
}

function normalizedCorners(screen: ScreenCandidate | null, width: number, height: number): Point[] | null {
  if (!screen || screen.polygon.length !== 4 || screen.cutOffSides.length > 0) return null;
  const corners: Point[] = [];
  for (let i = 0; i < 4; i++) {
    corners.push({ x: screen.polygon[i]!.x / width, y: screen.polygon[i]!.y / height });
  }
  return corners;
}

/**
 * Corner drift is preferred because the screen's content can change without the
 * camera moving, which would otherwise read as movement. The thumbnail is the
 * fallback when there's no fully visible screen to track.
 */
function measureMovement(
  previous: DetectionState | null,
  thumbnail: Uint8Array,
  corners: Point[] | null,
): number {
  if (!previous) return 0;
  if (corners && previous.corners) {
    let drift = 0;
    for (let i = 0; i < 4; i++) {
      drift += distance(corners[i]!, previous.corners[i]!);
    }
    return drift / 4;
  }
  return thumbnailDifference(previous.thumbnail, thumbnail);
}

/**
 * Runs the full pipeline on one grayscale frame: Canny edges and Otsu masks,
 * contours, approxPolyDP, candidate filtering, then blur, brightness and
 * movement measurements.
 */
export function processFrame<M>(
  cv: CvAdapter<M>,
  frame: GrayFrame,
  config: DetectionConfig,
  previous: DetectionState | null,
  options?: ProcessFrameOptions,
): { result: DetectionResult; state: DetectionState } {
  const scale = config.processingWidth / frame.width;
  const width = config.processingWidth;
  const height = Math.max(1, Math.round(frame.height * scale));
  const frameSize = { width, height };

  const owned: M[] = [];
  const track = (mat: M): M => {
    owned.push(mat);
    return mat;
  };

  try {
    const source = track(cv.fromGray(frame.data, frame.width, frame.height, frame.stride ?? frame.width));
    const small = track(cv.resize(source, width, height));
    const frameBrightness = cv.mean(small);
    const thumbnail = cv.toBytes(track(cv.resize(small, config.thumbnailWidth, config.thumbnailHeight)));

    const low = Math.min(
      config.cannyLowMax,
      Math.max(config.cannyLowMin, frameBrightness * config.cannyLowRatio),
    );
    const blurred = track(cv.gaussianBlur(small, config.blurKernel));
    const edges = track(cv.dilate(track(cv.canny(blurred, low, low * config.cannyHighRatio)), config.dilateKernel));
    cv.drawFrameBorder(edges);

    const minArea = width * height * config.minScreenAreaFraction;
    const contours: PolygonContour[] = cv.polygons(edges, minArea, config.approxEpsilons, config.maxPolygonVertices);
    // Content running off a cut-off screen splits its edge contour, so also look
    // for the screen as a solid bright or dark region.
    const masks = [
      track(cv.close(track(cv.otsu(blurred, false)), config.maskCloseKernel)),
      track(cv.close(track(cv.otsu(blurred, true)), config.maskCloseKernel)),
    ];
    for (let i = 0; i < masks.length; i++) {
      const found = cv.polygons(masks[i]!, minArea, config.approxEpsilons, config.maxPolygonVertices);
      for (let j = 0; j < found.length; j++) contours.push(found[j]!);
    }

    const screen = selectScreen(contours, frameSize, thumbnail, config);

    // Clarity and brightness are measured on the screen when there is one, so a
    // sharp, well-lit desk can't hide a blurred or dark screen.
    let laplacianVariance: number;
    let brightness = frameBrightness;
    if (screen) {
      const pad = 4;
      const x = Math.max(0, Math.floor(screen.minX) - pad);
      const y = Math.max(0, Math.floor(screen.minY) - pad);
      const roiWidth = Math.min(width, Math.ceil(screen.maxX) + pad) - x;
      const roiHeight = Math.min(height, Math.ceil(screen.maxY) + pad) - y;
      const roi = track(cv.crop(small, x, y, roiWidth, roiHeight));
      laplacianVariance = cv.laplacianVariance(roi);
      brightness = Math.max(frameBrightness, cv.mean(roi));
    } else {
      laplacianVariance = cv.laplacianVariance(small);
    }

    const corners = normalizedCorners(screen, width, height);
    const measurements: FrameMeasurements = {
      frame: frameSize,
      brightness,
      laplacianVariance,
      movement: measureMovement(previous, thumbnail, corners),
      screen,
      mirrored: options?.mirrored ?? false,
    };

    const thumbnailValues: number[] = [];
    for (let i = 0; i < thumbnail.length; i++) thumbnailValues.push(thumbnail[i]!);

    return {
      result: analyzeMeasurements(measurements, config),
      state: { thumbnail: thumbnailValues, corners },
    };
  } finally {
    for (let i = 0; i < owned.length; i++) cv.release(owned[i]!);
  }
}
