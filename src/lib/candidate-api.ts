import type {
  ApiErrorBody,
  CandidateInterviewDTO,
  JoinResponse,
  LiveKitTokenResponse,
  MonitoringEventType,
  MonitoringStatusInput,
} from '@/types';

/**
 * The candidate's side of the API, used by the browser joining page. It sends the
 * candidate token as a bearer header, so it never touches an interviewer's session
 * cookie that may exist in the same browser, and it never redirects to the login page.
 */
export class CandidateApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, options: { token?: string; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.body === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new CandidateApiError(0, 'network_error', 'Could not reach the server. Check your internet connection.');
  } finally {
    clearTimeout(timeout);
  }
  if (response.ok) return (await response.json()) as T;
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  throw new CandidateApiError(
    response.status,
    body?.error.code ?? 'request_failed',
    body?.error.message ?? `Request failed (${response.status})`,
  );
}

export const isInterviewEnded = (error: unknown) => error instanceof CandidateApiError && error.status === 410;

export const joinInterview = (interviewId: string, candidateName: string) =>
  request<JoinResponse>(`/api/interviews/${encodeURIComponent(interviewId)}/join`, {
    body: { candidateName, consentAccepted: true },
  });

export const getInterview = (token: string, interviewId: string) =>
  request<{ interview: CandidateInterviewDTO }>(`/api/interviews/${encodeURIComponent(interviewId)}`, { token });

export const endInterview = (token: string, interviewId: string) =>
  request<{ interview: CandidateInterviewDTO }>(`/api/interviews/${encodeURIComponent(interviewId)}/end`, {
    token,
    body: {},
  });

export const getLiveKitToken = (token: string, interviewId: string) =>
  request<LiveKitTokenResponse>('/api/livekit/token', { token, body: { interviewId } });

export const reportStatus = (token: string, status: MonitoringStatusInput) =>
  request('/api/monitoring/status', { token, body: status });

export const reportEvent = (token: string, interviewId: string, eventType: MonitoringEventType) =>
  request('/api/monitoring/events', { token, body: { interviewId, eventType } });
