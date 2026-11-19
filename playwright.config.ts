import { defineConfig } from '@playwright/test';

export const DASHBOARD_URL = process.env.DASHBOARD_URL ?? 'http://localhost:3000';

/** Uses the installed Chrome. Set to an empty string to use Playwright's own Chromium. */
export const BROWSER_CHANNEL = process.env.PLAYWRIGHT_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: DASHBOARD_URL, channel: BROWSER_CHANNEL || undefined },
  // The API is the Python server the dashboard proxies to (BACKEND_URL), so only the dashboard is started here.
  webServer: {
    command: 'npm run dev',
    url: DASHBOARD_URL + '/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
