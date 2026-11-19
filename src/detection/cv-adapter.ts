import type { Point } from '../types';

/** A contour simplified to a polygon by approxPolyDP. */
export interface PolygonContour {
  polygon: Point[];
  area: number;
}

/**
 * The OpenCV operations the pipeline needs, implemented over opencv.js for the
 * browser and the tests (opencvjs-adapter.ts). Each returns new Mats, which the
 * caller releases.
 */
export interface CvAdapter<M = unknown> {
  /** Wraps 8-bit grayscale bytes. `stride` is the distance between rows in `data`. */
  fromGray(data: Uint8Array, width: number, height: number, stride: number): M;
  resize(src: M, width: number, height: number): M;
  gaussianBlur(src: M, kernel: number): M;
  canny(src: M, low: number, high: number): M;
  dilate(src: M, kernel: number): M;
  /** Morphological closing: dilation followed by erosion. */
  close(src: M, kernel: number): M;
  /** Draws a 1px white rectangle on the frame edge, closing contours cut by the frame. */
  drawFrameBorder(src: M): void;
  otsu(src: M, inverse: boolean): M;
  crop(src: M, x: number, y: number, width: number, height: number): M;
  mean(src: M): number;
  laplacianVariance(src: M): number;
  toBytes(src: M): Uint8Array;
  /** Runs findContours and approxPolyDP, keeping contours of at least `minArea` pixels. */
  polygons(binary: M, minArea: number, epsilons: number[], maxVertices: number): PolygonContour[];
  release(mat: M): void;
}

export interface GrayFrame {
  data: Uint8Array;
  width: number;
  height: number;
  /** Bytes per row; defaults to `width`. */
  stride?: number;
}
