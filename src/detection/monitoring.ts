import type { DetectionResult, InstructionCode } from '../types';

/**
 * Whether calibration may finish. The score is a weighted sum, so a high total
 * could still hide one disqualifying problem such as a badly blurred image;
 * those are checked explicitly as well.
 */
export function isReadyToContinue(result: DetectionResult, threshold: number): boolean {
  return (
    result.screenDetected &&
    result.cornersDetected === 4 &&
    result.readinessScore >= threshold &&
    result.cutOffSides.length === 0 &&
    result.clarity !== 'poor' &&
    result.lighting === 'good' &&
    result.stability !== 'unstable'
  );
}

export const INSTRUCTION_TEXT: Record<InstructionCode, string> = {
  point_at_screen: 'Point the camera at the laptop screen',
  move_left: 'Move camera slightly left',
  move_right: 'Move camera slightly right',
  move_up: 'Move camera slightly up',
  move_down: 'Move camera slightly down',
  move_closer: 'Move camera closer',
  move_farther: 'Move camera farther away',
  increase_lighting: 'Increase lighting',
  reduce_glare: 'Reduce glare or screen brightness',
  hold_steady: 'Keep camera steady',
  improve_focus: 'Hold still and let the camera focus',
  correct_angle: 'Face the screen straight on',
  properly_positioned: 'Screen is properly positioned',
};

/**
 * Smooths a stream of results so one bad frame (a compression artefact, say)
 * doesn't produce a warning. It returns a real frame from the window, the median
 * by score among those on the majority side, rather than blending fields from
 * different frames, which could describe a state no frame was ever in.
 */
export function createResultSmoother(windowSize: number) {
  const window: DetectionResult[] = [];
  return (result: DetectionResult): DetectionResult => {
    window.push(result);
    if (window.length > windowSize) window.shift();
    const detected = window.filter((item) => item.screenDetected);
    const majority = detected.length * 2 > window.length;
    const pool = window.filter((item) => item.screenDetected === majority);
    const sorted = pool.slice().sort((a, b) => a.readinessScore - b.readinessScore);
    return sorted[Math.floor(sorted.length / 2)]!;
  };
}
