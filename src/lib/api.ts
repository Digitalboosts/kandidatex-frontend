import type { ApiErrorBody } from '@/types';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const networkError = () => new ApiRequestError(0, 'network_error', 'Could not reach the server. Check your connection.');

/** Turns a failed response into an ApiRequestError, sending the browser to login on 401. */
async function failure(response: Response, path: string): Promise<ApiRequestError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  if (response.status === 401 && !path.startsWith('/api/auth/') && typeof window !== 'undefined') {
    // A full navigation, so no signed-in client state survives an expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  const details = body?.error.details;
  const firstIssue = Array.isArray(details) ? (details as { message?: string }[])[0]?.message : undefined;
  return new ApiRequestError(
    response.status,
    body?.error.code ?? 'request_failed',
    firstIssue ?? body?.error.message ?? `Request failed (${response.status})`,
    details,
  );
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    });
  } catch {
    throw networkError();
  }
  if (response.ok) return (await response.json()) as T;
  throw await failure(response, path);
}

/** Sends raw bytes (not JSON) with PUT. For endpoints that answer 204 with no body. */
export async function apiPutBlob(path: string, blob: Blob): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
  } catch {
    throw networkError();
  }
  if (!response.ok) throw await failure(response, path);
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';
