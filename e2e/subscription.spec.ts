import { expect, test } from '@playwright/test';
import { registerInterviewer } from './helpers';

// Paying needs Razorpay, so these cover what an account without a plan sees.

test('without a plan, creating interviews is blocked and points to billing', async ({ page }) => {
  await registerInterviewer(page, { canCreate: false });
  await expect(page.getByTestId('plan-widget')).toContainText('No active plan');

  await page.goto('/interviews');
  await expect(page.getByTestId('plan-blocker')).toContainText('Subscribe to create interviews');
  await expect(page.getByRole('button', { name: 'New interview' })).toBeDisabled();

  // The server enforces it too, whatever the UI shows.
  const created = await page.request.post('/api/interviews', { data: { title: 'T', candidateName: 'C' } });
  expect(created.status()).toBe(402);
  expect((await created.json()).error.code).toBe('subscription_required');

  await page.getByRole('link', { name: 'View plan' }).click();
  await expect(page).toHaveURL(/\/billing$/);
  const { plan } = await (await page.request.get('/api/subscription/plan')).json();
  await expect(page.getByTestId('plan-price')).toHaveText(plan.amountDisplay);
  await expect(page.getByTestId('subscribe')).toBeEnabled();
  await expect(page.getByText('No payments yet.')).toBeVisible();
});
