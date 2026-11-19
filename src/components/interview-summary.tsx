'use client';

import type { InterviewSummaryDTO } from '@/types';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api, ApiRequestError, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Button, Card, ErrorNote } from './ui';

const FRIENDLY_ERRORS: Record<string, string> = {
  no_alerts: 'There are no stored screen alerts to summarise.',
  ai_not_configured: 'The AI summary is not set up on the server.',
  ai_timeout: 'The AI took too long. Try again in a moment.',
  ai_unavailable: 'The AI service is unavailable. Try again in a moment.',
  ai_invalid_response: 'The AI returned an unusable answer. Try again.',
};

/**
 * The AI-written summary of an interview's stored screen alerts. The server
 * writes it when the interview ends; Generate/Regenerate asks for a new one.
 */
export function InterviewSummary({
  interviewId,
  summary,
  alertCount,
  ended,
  onChange,
}: {
  interviewId: string;
  summary: InterviewSummaryDTO | null;
  /** Stored alerts now; generating needs at least one. */
  alertCount: number;
  ended: boolean;
  onChange: (summary: InterviewSummaryDTO) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const body = await api<{ summary: InterviewSummaryDTO }>(`/api/interviews/${interviewId}/summary`, { body: {} });
      onChange(body.summary);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? (FRIENDLY_ERRORS[caught.code] ?? caught.message) : errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const stale = summary !== null && alertCount > summary.alertCount;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-brand-600" aria-hidden /> AI summary
        </h2>
        {alertCount > 0 ? (
          <Button variant="secondary" onClick={generate} disabled={busy} className="px-3! py-1.5! text-xs" data-testid="generate-summary">
            <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden />
            {busy ? 'Writing…' : summary ? 'Regenerate' : 'Generate'}
          </Button>
        ) : null}
      </div>
      <div className="space-y-3 px-4 py-4">
        {summary ? (
          <>
            <p data-testid="summary-text" className="text-sm leading-6">
              {summary.summary}
            </p>
            <p className="text-xs text-ink-muted">
              Based on {summary.alertCount} screen alert{summary.alertCount === 1 ? '' : 's'} · {summary.wordCount} words ·
              updated {formatDateTime(summary.updatedAt)}
            </p>
            {stale ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-warn">
                More alerts were stored after this summary was written. Regenerate to include them.
              </p>
            ) : null}
          </>
        ) : (
          <p data-testid="summary-empty" className="text-sm text-ink-muted">
            {alertCount === 0
              ? 'No screen alerts were stored, so there is nothing to summarise.'
              : ended
                ? 'No summary yet. Generate one from the stored screen alerts.'
                : 'A summary is written automatically when the interview ends. You can also generate one now.'}
          </p>
        )}
        <ErrorNote message={error} />
        <p className="text-[11px] text-ink-muted">
          Written by AI from the alert text only; screenshots are never sent to it. A prompt for review, not a verdict.
        </p>
      </div>
    </Card>
  );
}
