# Screen detection engine

`src/detection`. This module measures how well a camera can see a screen. It does not read the screen,
verify its contents or detect cheating.

## Pipeline

For each frame (`processFrame` in `pipeline.ts`):

1. Downscale the grayscale frame to 360 px wide.
2. Measure brightness.
3. Gaussian blur, Canny edges, dilate to close gaps, and draw the frame edge into the map so a screen cut off by the
   frame still forms a closed contour.
4. Also build Otsu masks (bright and dark) and close them morphologically. This finds the screen as a solid region
   when window content running off a cut-off screen breaks up its edges.
5. Run `findContours` and `approxPolyDP` on all of these to get candidate polygons.
6. Filter the candidates, then pick the most plausible. If the winner contains a good nested rectangle, step inward to
   it: that's the display inside the laptop lid.
7. Measure blur (Laplacian variance) and brightness on the screen region, and movement against the previous frame.
8. Combine everything into a `DetectionResult`, the score and the guidance (`analysis.ts`).

## Result

```json
{
  "screenDetected": true,
  "cornersDetected": 4,
  "visibilityPercentage": 100,
  "clarity": "good",
  "lighting": "good",
  "stability": "stable",
  "alignment": "correct",
  "readinessScore": 95
}
```

The full type also carries `instructions`, `corners`, `cutOffSides`, `scoreBreakdown` and raw `metrics`.

## Readiness score

| Component | Points | Earned by |
| --- | --- | --- |
| Screen boundary | 25 | How well the contour fills its polygon, times visibility |
| Four corners | 25 | Corners visible inside the frame, out of 4 |
| Positioning | 20 | Centring, viewing angle, size in frame, how much is cut off |
| Clarity | 15 | Laplacian variance |
| Lighting | 10 | Brightness within the good range |
| Stability | 5 | Low frame-to-frame movement |

Without a detected screen the first three are zero, so the score can't exceed 30.

The score is a weighted sum, so a high total could hide one serious problem: a badly blurred frame can still score 85.
So `isReadyToContinue` also requires four corners, nothing cut off, clarity better than poor, good lighting and a
camera that isn't unstable. The candidate's page also needs six passing measurements in a row.

The threshold is set on the API server (default 80) and delivered as `readinessThreshold` when the candidate joins,
so changing it needs no dashboard release.

## Visibility

- **Fully in frame:** how completely the contour fills its four-corner polygon.
- **Cut off:** an estimate, from the visible size and an assumed 16:10 screen (`expectedAspectRatio`). It's capped at
  95, because a cut-off screen is never fully visible.

## Thresholds

All are in `DetectionConfig` (`config.ts`).

| Setting | Default | Meaning |
| --- | --- | --- |
| `processingWidth` | 360 | Width frames are analyzed at. Laplacian values depend on it, so retune clarity if you change it |
| `blurKernel` | 5 | Gaussian blur before edge detection |
| `cannyLowRatio`, `cannyLowMin`, `cannyLowMax` | 0.5, 20, 80 | Low Canny threshold, from mean brightness |
| `cannyHighRatio` | 2.5 | High Canny threshold, relative to the low one |
| `dilateKernel` | 3 | Closes small gaps in edges |
| `maskCloseKernel` | 9 | Fills screen content into a solid region |
| `approxEpsilons` | 0.02, 0.03, 0.05 | `approxPolyDP` tolerances tried in turn, as a fraction of perimeter |
| `maxPolygonVertices` | 6 | Cut-off screens can have more than 4 vertices |
| `minScreenAreaFraction` | 0.05 | Smaller contours are ignored |
| `borderMarginFraction` | 0.02 | A vertex this near the frame edge counts as clipped |
| `minAspectRatio`, `maxAspectRatio` | 1.2, 2.6 | Width to height range of a screen |
| `expectedAspectRatio` | 1.6 | Used only to estimate a cut-off screen's hidden part |
| `minCornerAngle`, `maxCornerAngle` | 60, 120 | Rejects shapes that aren't rectangles in perspective |
| `minVisibleCorners` | 2 | Fewer can't be told apart from background shapes |
| `minRectangularity`, `fullRectangularity` | 0.8, 0.95 | How fully the contour must fill its polygon, and what counts as perfect |
| `minInteriorContrast` | 6 | Brightness difference needed between inside and outside |
| `nestedAreaRatio` | 0.65 | How small a nested rectangle may be and still count as the display |
| `clarityGood`, `clarityFair` | 250, 80 | Laplacian variance levels |
| `minBrightness`, `goodBrightnessLow`, `goodBrightnessHigh`, `maxBrightness` | 35, 60, 215, 245 | Brightness levels, 0-255 |
| `stableMovement`, `unstableMovement` | 0.012, 0.04 | Movement levels, as a fraction of the frame per measurement |
| `centerTolerance`, `maxOffset` | 0.12, 0.35 | Accepted centre offset, and where positioning reaches zero |
| `perspectiveTolerance`, `maxPerspective` | 0.2, 0.55 | Accepted distortion, and where positioning reaches zero |
| `tooFarFill`, `tooCloseFill` | 0.55, 0.98 | Size limits, measured on whichever of width or height fills the frame more |

## Tuning: this still needs real footage

**These defaults were tuned on rendered scenes (`test/synth.ts`), not on photographs or real phone
cameras.** Expect to adjust them, the clarity levels in particular. Real optics, moiré from photographing a display,
screen glare and video compression will all shift the measurements.

To tune: log `result.metrics` during calibration across a range of real laptops, rooms and phones, then set the levels
from what you see for setups you judge good and bad.

## Known limits

- Any rectangular object with a screen-like shape can be taken for a screen. Paper and tablets are filtered only by
  size and shape.
- The screen may be detected when part of it is covered, if the outline stays intact.
- A phone held in portrait sees a laptop smaller than it would in landscape, so landscape usually scores higher.
