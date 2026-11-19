import type { ScreenAlertLevel, ScreenAppCategory } from '@/types';
import { AppWindow } from 'lucide-react';
import { formatTime } from '@/lib/format';
import type { ScreenAnalyzer } from '@/lib/use-screen-analyzer';
import { Card } from './ui';

export const CATEGORY_LABELS: Record<ScreenAppCategory, string> = {
  DESKTOP: 'Desktop',
  CODE_EDITOR: 'Code editor',
  IDE: 'IDE',
  WEB_BROWSER: 'Web browser',
  AI_ASSISTANT: 'AI assistant',
  TERMINAL: 'Terminal',
  DOCUMENT_EDITOR: 'Document editor',
  SPREADSHEET: 'Spreadsheet',
  PRESENTATION: 'Presentation',
  VIDEO_CALL: 'Video call',
  FILE_MANAGER: 'File manager',
  OTHER: 'Other',
  UNKNOWN: 'Unknown',
};

// Wording is deliberately "review", never "cheating": the reading is an AI guess about one frame.
export const ALERT_STYLES: Record<ScreenAlertLevel, { label: string; className: string }> = {
  HIGH: { label: 'Review recommended', className: 'bg-amber-50 text-warn' },
  MEDIUM: { label: 'Application changed', className: 'bg-brand-50 text-brand-700' },
  LOW: { label: 'Normal', className: 'bg-green-50 text-good' },
};

/** What the AI screen analyzer last saw on the candidate's screen. */
export function ScreenAppPanel({ analyzer, canAnalyze }: { analyzer: ScreenAnalyzer; canAnalyze: boolean }) {
  const { result, resultAt, state, note } = analyzer;
  const alert = result ? ALERT_STYLES[result.alert_level] : null;

  let placeholder: string;
  if (!canAnalyze) placeholder = 'Screen analysis runs for the interview’s own interviewer.';
  else if (state === 'stopped') placeholder = note ?? 'Screen analysis stopped.';
  else if (state === 'off') placeholder = 'Starts when the candidate’s video is live.';
  else placeholder = 'Analysing the screen…';

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <AppWindow className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Screen application</h2>
            {alert ? (
              <span
                data-testid="screen-app-alert"
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${alert.className}`}
              >
                {alert.label}
              </span>
            ) : null}
          </div>
          {result ? (
            <>
              <p className="mt-1 text-base font-semibold" data-testid="screen-app-name">
                {result.application}
                <span className="ml-2 text-sm font-normal text-ink-soft">{CATEGORY_LABELS[result.category] ?? result.category}</span>
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">{result.message || result.activity}</p>
              <p className="mt-1 text-xs text-ink-muted">
                Confidence {Math.round(result.confidence * 100)}%{resultAt ? ` · as of ${formatTime(new Date(resultAt).toISOString())}` : ''}
                {state === 'stopped' && note ? ` · ${note}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted" data-testid="screen-app-placeholder">
              {placeholder}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            An AI reading of camera frames, sent to the server at random moments 1 to 10 seconds apart. A review flag is a prompt to look,
            not evidence of wrongdoing.
          </p>
        </div>
      </div>
    </Card>
  );
}
