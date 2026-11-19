import { expect, test } from '@playwright/test';
import { ADMIN_CODE, createInterview, registerInterviewer } from './helpers';

const CANDIDATE = 'Sam Candidate';

const goodStatus = {
  source: 'calibration',
  screenDetected: true,
  visibilityPercentage: 100,
  clarity: 'good',
  lighting: 'good',
  stability: 'stable',
  alignment: 'correct',
  readinessScore: 96,
};

test('sends signed-out visitors to the login page', async ({ page }) => {
  await page.goto('/interviews');
  await expect(page).toHaveURL(/\/login\?next=%2Finterviews/);
});

test('rejects a wrong password with a visible error', async ({ page }) => {
  const { email } = await registerInterviewer(page);
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('not the password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible();
});

test('interview lifecycle, with the candidate camera played by API calls', async ({ page, request, browser, baseURL }) => {
  await registerInterviewer(page);
  const id = await createInterview(page, CANDIDATE);

  await expect(page.getByTestId('join-link')).toHaveText(new RegExp(`/join/${id}$`));
  await expect(page.getByTestId('interview-status')).toHaveText('Scheduled');

  // The link the candidate receives works without an account.
  const signedOut = await browser.newContext({ baseURL });
  const joinPage = await signedOut.newPage();
  await joinPage.goto(`/join/${id}`);
  // The candidate joins in the browser: the ID comes from the link, and nothing starts before consent.
  await expect(joinPage.getByTestId('interview-id-input')).toHaveValue(id);
  await joinPage.getByTestId('candidate-name-input').fill('Somebody Else');
  await expect(joinPage.getByTestId('start-interview')).toBeDisabled();
  await joinPage.getByTestId('consent-toggle').check();
  await joinPage.getByTestId('start-interview').click();
  await expect(joinPage.getByRole('alert').filter({ hasText: 'No interview matches this ID and name' })).toBeVisible();
  await joinPage.getByTestId('candidate-name-input').fill(CANDIDATE);
  await joinPage.getByTestId('start-interview').click();
  await expect(joinPage.getByRole('heading', { name: 'Camera and microphone' })).toBeVisible();
  await signedOut.close();

  const wrongName = await request.post(`/api/interviews/${id}/join`, {
    data: { candidateName: 'Somebody Else', consentAccepted: true },
  });
  expect(wrongName.status()).toBe(404);

  const joined = await request.post(`/api/interviews/${id}/join`, {
    data: { candidateName: CANDIDATE, consentAccepted: true },
  });
  expect(joined.status()).toBe(200);
  const { token, readinessThreshold } = await joined.json();
  expect(readinessThreshold).toBeGreaterThan(0);
  const headers = { authorization: `Bearer ${token}` };

  const status = await request.post('/api/monitoring/status', {
    headers,
    data: { interviewId: id, ...goodStatus },
  });
  expect(status.status()).toBe(200);
  const event = await request.post('/api/monitoring/events', {
    headers,
    data: { interviewId: id, eventType: 'calibration_passed' },
  });
  expect(event.status()).toBe(201);
});

test('timeline updates live and ending reaches the candidate', async ({ page, request }) => {
  await registerInterviewer(page);
  const id = await createInterview(page, CANDIDATE);

  const joined = await request.post(`/api/interviews/${id}/join`, {
    data: { candidateName: CANDIDATE, consentAccepted: true },
  });
  const { token } = await joined.json();
  const headers = { authorization: `Bearer ${token}` };

  await expect(page.getByTestId('event-timeline')).toContainText('Candidate joined.');
  await expect(page.getByTestId('event-timeline')).toContainText('accepted the live monitoring notice');

  await request.post('/api/monitoring/events', { headers, data: { interviewId: id, eventType: 'calibration_passed' } });
  await expect(page.getByTestId('event-timeline')).toContainText('Screen calibration passed.');

  await page.getByRole('button', { name: 'End interview' }).click();
  await page.getByTestId('confirm-dialog-confirm').click();
  await expect(page.getByTestId('interview-status')).toHaveText(/Completed|Cancelled/);
  await expect(page.getByRole('button', { name: 'End interview' })).toHaveCount(0);

  const seenByCandidate = await request.get(`/api/interviews/${id}`, { headers });
  expect((await seenByCandidate.json()).interview.status).toMatch(/COMPLETED|CANCELLED/);
  const afterEnd = await request.post('/api/livekit/token', { headers, data: { interviewId: id } });
  expect(afterEnd.status()).toBe(410);
});

test('overview counts the interviewer\'s real interviews', async ({ page }) => {
  // Admins' totals cover everyone's interviews, so exact counts only hold for a plain interviewer.
  test.skip(Boolean(ADMIN_CODE), 'needs a subscribed interviewer, not an admin');
  await registerInterviewer(page);
  await createInterview(page, CANDIDATE);
  await createInterview(page, 'Another Candidate');
  await page.goto('/dashboard');
  const totals = page.getByRole('region', { name: 'Interview totals' });
  await expect(totals.getByText('Total interviews').locator('..')).toContainText('2');
  await expect(totals.getByText('Upcoming').locator('..')).toContainText('2');
});

test('one interviewer cannot open another\'s interview', async ({ page, browser }) => {
  await registerInterviewer(page);
  const id = await createInterview(page, CANDIDATE);

  const other = await (await browser.newContext({ baseURL: page.url().split('/interviews')[0] })).newPage();
  await registerInterviewer(other, { canCreate: false });
  await other.goto(`/interviews/${id}`);
  await expect(other.getByRole('alert').filter({ hasText: 'do not have access' })).toBeVisible();
  await other.context().close();
});
