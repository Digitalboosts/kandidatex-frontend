import { expect, type Page } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/**
 * Creating interviews needs a paid plan, which a fresh account doesn't have.
 * Set E2E_ADMIN_CODE (the server's ADMIN_REGISTRATION_CODE) to register the
 * accounts that create interviews as admins, who aren't limited.
 */
export const ADMIN_CODE = process.env.E2E_ADMIN_CODE ?? '';

/**
 * Registers a fresh account through the UI and lands on the overview. With
 * `canCreate` (the default) it registers as an admin when E2E_ADMIN_CODE is set.
 */
export async function registerInterviewer(
  page: Page,
  { canCreate = true }: { canCreate?: boolean } = {},
): Promise<{ email: string; password: string }> {
  const email = `interviewer-${unique()}@example.com`;
  const password = 'correct horse battery';
  await page.goto('/register');
  await page.getByLabel('Name').fill('Dana Reviewer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  if (canCreate && ADMIN_CODE) await page.getByLabel('Admin code (optional)').fill(ADMIN_CODE);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  return { email, password };
}

/** Creates an interview through the UI and returns its ID. */
export async function createInterview(page: Page, candidateName: string): Promise<string> {
  await page.goto('/interviews');
  await page.getByRole('button', { name: 'New interview' }).click();
  await page.getByLabel('Title').fill('Senior backend engineer');
  await page.getByLabel('Candidate name').fill(candidateName);
  await page.getByRole('button', { name: 'Create interview' }).click();
  const id = page.getByTestId('interview-id');
  await expect(id).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  return (await id.textContent())!;
}
