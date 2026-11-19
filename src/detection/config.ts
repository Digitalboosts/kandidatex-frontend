/**
 * Thresholds for the screen detection engine. See docs/SCREEN_DETECTION.md for
 * how each one was chosen and how to tune it against real camera footage.
 */
export interface DetectionConfig {
  /** Frames are downscaled to this width before processing. */
  processingWidth: number;
  /** Gaussian blur kernel applied before edge detection (odd). */
  blurKernel: number;
  /** Canny low threshold = mean brightness * ratio, clamped to the range below. */
  cannyLowRatio: number;
  cannyLowMin: number;
  cannyLowMax: number;
  /** Canny high threshold = low threshold * ratio. */
  cannyHighRatio: number;
  /** Dilation kernel that closes small gaps in the edge map (odd). */
  dilateKernel: number;
  /** Closing kernel that fills screen content (text, windows) into a solid Otsu region (odd). */
  maskCloseKernel: number;
  /** approxPolyDP epsilons, as fractions of the contour perimeter, tried in order. */
  approxEpsilons: number[];
  /** Polygons with more vertices than this are not considered. */
  maxPolygonVertices: number;

  /** Contours smaller than this fraction of the frame are ignored. */
  minScreenAreaFraction: number;
  /** A vertex this close to the frame edge (fraction of the short side) is treated as clipped. */
  borderMarginFraction: number;
  /** Allowed width/height range of a fully visible screen. */
  minAspectRatio: number;
  maxAspectRatio: number;
  /** Assumed aspect ratio, used only to estimate how much of a cut-off screen is hidden. */
  expectedAspectRatio: number;
  /** Corner angles outside this range (degrees) reject a candidate. */
  minCornerAngle: number;
  maxCornerAngle: number;
  /** Candidates need at least this many visible corners. */
  minVisibleCorners: number;
  /** Candidates whose contour fills less than this much of their polygon are rejected. */
  minRectangularity: number;
  /** Rectangularity treated as a perfect boundary when scoring. */
  fullRectangularity: number;
  /** Minimum brightness difference between the inside and outside of a candidate. */
  minInteriorContrast: number;
  /** A candidate nested in the best one is preferred (it's the display inside the lid) above this area ratio. */
  nestedAreaRatio: number;

  /**
   * Laplacian variance, measured on the screen including its boundary, at or
   * above which clarity is good / fair. The boundary is included so a blank
   * white page in focus isn't reported as blurred.
   */
  clarityGood: number;
  clarityFair: number;
  /** Brightness (0-255) outside minBrightness..maxBrightness is poor lighting. */
  minBrightness: number;
  goodBrightnessLow: number;
  goodBrightnessHigh: number;
  maxBrightness: number;
  /** Movement at or below `stableMovement` is stable; above `unstableMovement` is unstable. */
  stableMovement: number;
  unstableMovement: number;

  /** Screen centre may sit this far from the frame centre (fraction of frame) and still be correct. */
  centerTolerance: number;
  /** Offset at which the positioning score reaches zero. */
  maxOffset: number;
  /** Perspective distortion (0..1) accepted as correct / at which positioning reaches zero. */
  perspectiveTolerance: number;
  maxPerspective: number;
  /** Largest of width-fill and height-fill below which the screen is too far / above which too close. */
  tooFarFill: number;
  tooCloseFill: number;
  /** Size of the thumbnail compared between frames for movement. */
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  processingWidth: 360,
  blurKernel: 5,
  cannyLowRatio: 0.5,
  cannyLowMin: 20,
  cannyLowMax: 80,
  cannyHighRatio: 2.5,
  dilateKernel: 3,
  maskCloseKernel: 9,
  approxEpsilons: [0.02, 0.03, 0.05],
  maxPolygonVertices: 6,

  minScreenAreaFraction: 0.05,
  borderMarginFraction: 0.02,
  minAspectRatio: 1.2,
  maxAspectRatio: 2.6,
  expectedAspectRatio: 1.6,
  minCornerAngle: 60,
  maxCornerAngle: 120,
  minVisibleCorners: 2,
  minRectangularity: 0.8,
  fullRectangularity: 0.95,
  minInteriorContrast: 6,
  nestedAreaRatio: 0.65,

  clarityGood: 250,
  clarityFair: 80,
  minBrightness: 35,
  goodBrightnessLow: 60,
  goodBrightnessHigh: 215,
  maxBrightness: 245,
  stableMovement: 0.012,
  unstableMovement: 0.04,

  centerTolerance: 0.12,
  maxOffset: 0.35,
  perspectiveTolerance: 0.2,
  maxPerspective: 0.55,
  tooFarFill: 0.55,
  tooCloseFill: 0.98,
  thumbnailWidth: 32,
  thumbnailHeight: 18,
};

