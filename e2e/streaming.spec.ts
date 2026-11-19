import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import { BROWSER_CHANNEL } from '../playwright.config';
import { createInterview, registerInterviewer } from './helpers';

const CANDIDATE = 'Sam Candidate';

/**
 * Writes a Y4M clip of a laptop on a desk, which Chromium plays as its fake
 * camera. This stands in for the candidate: a browser publishing through the same
 * tokens and the same LiveKit server, with real encoded media.
 */
function writeLaptopClip(): string {
  const width = 640;
  const height = 360;
  const luma = new Uint8Array(width * height).fill(120);
  const fill = (x0: number, y0: number, x1: number, y1: number, value: number) => {
    for (let y = y0; y < y1; y++) luma.fill(value, y * width + x0, y * width + x1);
  };
  fill(90, 40, 550, 320, 25);
  fill(102, 52, 538, 308, 225);
  fill(102, 52, 538, 72, 150);
  for (let row = 0; row < 12; row++) {
    fill(125, 86 + row * 18, 125 + 120 + ((row * 67) % 260), 92 + row * 18, 70);
  }
  const chroma = new Uint8Array((width / 2) * (height / 2)).fill(128);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luma, chroma, chroma]);
  const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420\n`);
  const directory = join(tmpdir(), 'interview-monitoring-e2e');
  mkdirSync(directory, { recursive: true });
  const path = join(directory, 'laptop.y4m');
  writeFileSync(path, Buffer.concat([header, ...Array.from({ length: 20 }, () => frame)]));
  return path;
}

test('real media flows from a publisher through LiveKit to the dashboard', async ({ page, request, baseURL }) => {
  await registerInterviewer(page);
  const id = await createInterview(page, CANDIDATE);

  const joined = await request.post(`/api/interviews/${id}/join`, {
    data: { candidateName: CANDIDATE, consentAccepted: true },
  });
  const { token: session } = await joined.json();
  const issued = await request.post('/api/livekit/token', {
    headers: { authorization: `Bearer ${session}` },
    data: { interviewId: id },
  });
  test.skip(issued.status() === 503, 'The API server reports LiveKit as unreachable.');
  expect(issued.status()).toBe(200);
  const { token, url } = (await issued.json()) as { token: string; url: string };
  // The LiveKit address comes from the API server; its HTTP side answers on the same host and port.
  const livekitHttp = url.replace(/^ws/, 'http');
  const reachable = await request.get(livekitHttp).then(() => true, () => false);
  test.skip(!reachable, `The LiveKit server the API hands out (${url}) can't be reached from here.`);

  const browser = await chromium.launch({
    channel: BROWSER_CHANNEL || undefined,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${writeLaptopClip()}`,
      // The publisher's page is a route-fulfilled stub, which Chrome treats as public and blocks from local addresses.
      '--disable-features=LocalNetworkAccessChecks',
    ],
  });
  try {
    // A blank page on localhost: a secure context, without the dashboard's
    // Permissions-Policy, which rightly forbids capture on dashboard pages.
    const publisher = await (await browser.newContext()).newPage();
    await publisher.route('http://localhost:9/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>candidate</title>' }));
    await publisher.goto('http://localhost:9/candidate');
    const umd = require.resolve('livekit-client');
    await publisher.addScriptTag({ path: umd });
    await publisher.evaluate(
      async ({ serverUrl, accessToken }) => {
        const { Room, RoomEvent } = (window as unknown as { LivekitClient: typeof import('livekit-client') }).LivekitClient;
        const room = new Room();
        (window as unknown as { disconnectReason?: unknown }).disconnectReason = undefined;
        room.on(RoomEvent.Disconnected, (reason) => {
          (window as unknown as { disconnectReason?: unknown }).disconnectReason = reason;
        });
        await room.connect(serverUrl, accessToken);
        await room.localParticipant.setCameraEnabled(true);
      },
      { serverUrl: url, accessToken: token },
    );

    await page.goto(`${baseURL}/interviews/${id}/live`);
    await expect(page.getByTestId('candidate-name')).toHaveText(CANDIDATE);
    await expect(page.getByTestId('status-camera')).toHaveText('Streaming', { timeout: 30_000 });

    // Frames are really being decoded: the size is known and playback advances.
    const video = page.getByTestId('candidate-video');
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth), { timeout: 30_000 }).toBeGreaterThan(0);
    const before = await video.evaluate((el: HTMLVideoElement) => el.currentTime);
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime), { timeout: 15_000 }).toBeGreaterThan(before);

    // The analyzer found the laptop in the encoded stream, and the timeline recorded it.
    await expect(page.getByTestId('status-screen')).toHaveText('Detected', { timeout: 60_000 });
    await expect(page.getByTestId('event-timeline')).toContainText('Screen detected.', { timeout: 30_000 });

    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByTestId('confirm-dialog-confirm').click();
    await expect(page.getByTestId('session-ended')).toBeVisible();

    // The candidate's side is disconnected by the room being deleted.
    await expect
      .poll(() => publisher.evaluate(() => (window as unknown as { disconnectReason?: unknown }).disconnectReason), { timeout: 20_000 })
      .toBeDefined();
  } finally {
    await browser.close();
  }
});
