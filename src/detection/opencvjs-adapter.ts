import type { Point } from '../types';
import type { CvAdapter, PolygonContour } from './cv-adapter';

/* eslint-disable @typescript-eslint/no-explicit-any -- opencv.js ships no usable types for its runtime object */

/** CvAdapter backed by opencv.js (WASM), used by the dashboard's stream analyzer and by tests. */
export function createOpenCvJsAdapter(cv: any): CvAdapter<any> {
  return {
    fromGray(data, width, height, stride) {
      const mat = new cv.Mat(height, stride, cv.CV_8UC1);
      mat.data.set(data.subarray(0, height * stride));
      if (stride === width) return mat;
      const roi = mat.roi(new cv.Rect(0, 0, width, height));
      const cropped = roi.clone();
      roi.delete();
      mat.delete();
      return cropped;
    },
    resize(src, width, height) {
      const dst = new cv.Mat();
      cv.resize(src, dst, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
      return dst;
    },
    gaussianBlur(src, kernel) {
      const dst = new cv.Mat();
      cv.GaussianBlur(src, dst, new cv.Size(kernel, kernel), 0);
      return dst;
    },
    canny(src, low, high) {
      const dst = new cv.Mat();
      cv.Canny(src, dst, low, high);
      return dst;
    },
    dilate(src, kernel) {
      const dst = new cv.Mat();
      const element = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernel, kernel));
      cv.dilate(src, dst, element);
      element.delete();
      return dst;
    },
    close(src, kernel) {
      const dst = new cv.Mat();
      const element = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernel, kernel));
      cv.morphologyEx(src, dst, cv.MORPH_CLOSE, element);
      element.delete();
      return dst;
    },
    drawFrameBorder(src) {
      cv.rectangle(src, new cv.Point(0, 0), new cv.Point(src.cols - 1, src.rows - 1), new cv.Scalar(255), 1);
    },
    otsu(src, inverse) {
      const dst = new cv.Mat();
      cv.threshold(src, dst, 0, 255, (inverse ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY) + cv.THRESH_OTSU);
      return dst;
    },
    crop(src, x, y, width, height) {
      const roi = src.roi(new cv.Rect(x, y, width, height));
      const cropped = roi.clone();
      roi.delete();
      return cropped;
    },
    mean(src) {
      return cv.mean(src)[0];
    },
    laplacianVariance(src) {
      const laplacian = new cv.Mat();
      const mean = new cv.Mat();
      const stddev = new cv.Mat();
      cv.Laplacian(src, laplacian, cv.CV_64F);
      cv.meanStdDev(laplacian, mean, stddev);
      const deviation: number = stddev.doubleAt(0, 0);
      laplacian.delete();
      mean.delete();
      stddev.delete();
      return deviation * deviation;
    },
    toBytes(src) {
      return new Uint8Array(src.data);
    },
    polygons(binary, minArea, epsilons, maxVertices) {
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      const results: PolygonContour[] = [];
      cv.findContours(binary, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area: number = cv.contourArea(contour);
        if (area >= minArea) {
          const perimeter: number = cv.arcLength(contour, true);
          for (const epsilon of epsilons) {
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, epsilon * perimeter, true);
            const vertices: number = approx.rows;
            if (vertices >= 3 && vertices <= maxVertices) {
              const polygon: Point[] = [];
              for (let v = 0; v < vertices; v++) {
                polygon.push({ x: approx.data32S[v * 2], y: approx.data32S[v * 2 + 1] });
              }
              results.push({ polygon, area });
              approx.delete();
              break;
            }
            approx.delete();
          }
        }
        contour.delete();
      }
      contours.delete();
      hierarchy.delete();
      return results;
    },
    release(mat) {
      mat.delete();
    },
  };
}
