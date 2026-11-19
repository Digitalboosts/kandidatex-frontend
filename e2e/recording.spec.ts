import { expect, test } from '@playwright/test';
import { createInterview, registerInterviewer } from './helpers';

const CANDIDATE = 'Sam Candidate';

/** A 1×1 PNG: enough to exercise validation and the AI round trip. */
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('screen analysis: validates the image and answers with the six documented fields', async ({ page }) => {
  await registerInterviewer(page);
  const id = await createInterview(page, CANDIDATE);

  const bad = await page.request.post('/api/monitoring/screen-analysis', { data: { interviewId: id, image: 'not-an-image' } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error.code).toBe('invalid_image');

  const res = await page.request.post('/api/monitoring/screen-analysis', {
    data: { interviewId: id, image: `data:image/png;base64,${TINY_PNG}` },
  });
  // The AI may be unconfigured or slow on a test server; the dashboard skips those frames.
  test.skip([502, 503, 504].includes(res.status()), `screen analysis AI unavailable (${res.status()})`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Object.keys(body).sort()).toEqual(['activity', 'alert_level', 'application', 'category', 'confidence', 'message']);
  expect(['HIGH', 'MEDIUM', 'LOW']).toContain(body.alert_level);
});

test('recording: chunked upload, completion, history and playback', async ({ page }) => {
  await registerInterviewer(page);
  const id = await createInterview(page, CANDIDATE);

  const started = await page.request.post('/api/recordings', { data: { interviewId: id, contentType: 'video/webm' } });
  test.skip(started.status() === 503, 'recording storage is not configured on this API server');
  expect(started.status()).toBe(201);
  const { recording } = await started.json();
  expect(recording.status).toBe('RECORDING');

  const chunk = (n: number) => ({ headers: { 'Content-Type': 'video/webm' }, data: Buffer.alloc(1024, n) });
  expect((await page.request.put(`/api/recordings/${recording.id}/chunks/0`, chunk(0))).status()).toBe(204);
  expect((await page.request.put(`/api/recordings/${recording.id}/chunks/2`, chunk(2))).status()).toBe(204);

  // A gap is reported with the missing indexes, which is what the dashboard re-uploads.
  const gap = await page.request.post(`/api/recordings/${recording.id}/complete`, { data: { chunkCount: 3 } });
  expect(gap.status()).toBe(400);
  const gapBody = await gap.json();
  expect(gapBody.error.code).toBe('chunks_missing');
  expect(gapBody.error.details.missing).toEqual([1]);

  expect((await page.request.put(`/api/recordings/${recording.id}/chunks/1`, chunk(1))).status()).toBe(204);
  const done = await page.request.post(`/api/recordings/${recording.id}/complete`, {
    data: { chunkCount: 3, durationSeconds: 15 },
  });
  expect(done.status()).toBe(200);
  const ready = (await done.json()).recording;
  expect(ready.status).toBe('READY');
  expect(ready.videoUrl).toBe(`/api/recordings/${recording.id}/video`);

  const ranged = await page.request.get(ready.videoUrl, { headers: { Range: 'bytes=0-9' } });
  expect(ranged.status()).toBe(206);
  expect((await ranged.body()).length).toBe(10);

  // History on the interview page, playable in place through this origin with the session cookie.
  await page.goto(`/interviews/${id}`);
  await expect(page.getByTestId('recordings-list')).toContainText('Ready');
  await page.getByTestId('play-recording').click();
  await expect(page.getByTestId('recording-player')).toHaveAttribute('src', ready.videoUrl);

  // And on the recordings page, with the interview it belongs to.
  await page.goto('/recordings');
  await expect(page.getByTestId('recordings-list')).toContainText(CANDIDATE);
});
