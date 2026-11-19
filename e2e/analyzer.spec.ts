import type { DetectionResult } from '@/types';
import { expect, type Page, test } from '@playwright/test';

async function latest(page: Page): Promise<DetectionResult | null> {
  const text = await page.getByTestId('analyzer-result').textContent();
  return text ? (JSON.parse(text) as DetectionResult) : null;
}

/**
 * Runs the real worker and real opencv.js on a real <video> fed by a drawn
 * canvas, so everything but the network hop to LiveKit is exercised.
 */
test('stream analyzer measures what the video actually shows', async ({ page }) => {
  await page.goto('/dev/analyzer');
  await expect(page.getByTestId('analyzer-state')).toHaveText('running', { timeout: 45_000 });

  await expect.poll(async () => (await latest(page))?.screenDetected, { timeout: 20_000 }).toBe(true);
  const good = (await latest(page))!;
  expect(good.cornersDetected).toBe(4);
  expect(good.visibilityPercentage).toBeGreaterThanOrEqual(90);
  expect(good.readinessScore).toBeGreaterThanOrEqual(80);

  await page.getByTestId('scene-cutoff').click();
  await expect.poll(async () => (await latest(page))?.cutOffSides ?? [], { timeout: 20_000 }).toContain('left');
  const cut = (await latest(page))!;
  expect(cut.visibilityPercentage).toBeLessThan(90);
  expect(cut.cornersDetected).toBeLessThan(4);

  await page.getByTestId('scene-none').click();
  await expect.poll(async () => (await latest(page))?.screenDetected, { timeout: 20_000 }).toBe(false);
  const none = (await latest(page))!;
  expect(none.visibilityPercentage).toBe(0);
  expect(none.readinessScore).toBeLessThanOrEqual(30);
});
