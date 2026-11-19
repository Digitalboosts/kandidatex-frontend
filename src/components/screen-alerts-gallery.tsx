'use client';

import type { ScreenAlertDTO } from '@/types';
import { Bot, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { CATEGORY_LABELS } from './screen-app-panel';

function Thumbnail({ alert }: { alert: ScreenAlertDTO }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-ink-muted">
        <ImageOff className="size-5" aria-label="Screenshot unavailable" />
      </div>
    );
  }
  return (
    // Same-origin API image, authorised by the session cookie: next/image can't optimise it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={alert.imageUrl}
      alt={`Screenshot: ${alert.application}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-video w-full bg-slate-900 object-cover transition-transform duration-200 group-hover:scale-[1.02]"
    />
  );
}

/**
 * Stored HIGH screen alerts as screenshot cards. Clicking one opens it full
 * size. Never labelled as cheating: these are prompts to review.
 */
export function ScreenAlertsGallery({
  alerts,
  onOpen,
  showInterview = false,
  emptyText = 'No screen alerts. Nothing on screen needed review.',
}: {
  alerts: ScreenAlertDTO[];
  onOpen: (alert: ScreenAlertDTO) => void;
  showInterview?: boolean;
  emptyText?: string;
}) {
  if (alerts.length === 0) {
    return (
      <p data-testid="no-screen-alerts" className="px-4 py-8 text-center text-sm text-ink-muted">
        {emptyText}
      </p>
    );
  }
  return (
    <ul data-testid="screen-alerts" className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {alerts.map((alert) => (
        <li key={alert.id} className="overflow-hidden rounded-xl border border-line bg-white">
          <button
            type="button"
            onClick={() => onOpen(alert)}
            className="group relative block w-full overflow-hidden text-left"
            aria-label={`Open screenshot: ${alert.application}`}
          >
            <Thumbnail alert={alert} />
            <span className="absolute left-2 top-2 rounded-full bg-red-600/90 px-2 py-0.5 text-[11px] font-medium text-white">
              Review recommended
            </span>
          </button>
          <div className="space-y-1 p-3">
            <div className="flex items-center gap-1.5">
              <Bot className="size-3.5 shrink-0 text-bad" aria-hidden />
              <p className="min-w-0 truncate text-sm font-semibold">{alert.application}</p>
              <span className="ml-auto shrink-0 text-[11px] tabular-nums text-ink-muted">
                {Math.round(alert.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-ink-muted">{CATEGORY_LABELS[alert.category] ?? alert.category}</p>
            <p className="line-clamp-2 text-xs text-ink-soft">{alert.message}</p>
            <p className="pt-1 text-[11px] text-ink-muted">
              {formatDateTime(alert.createdAt)}
              {showInterview ? (
                <>
                  {' · '}
                  <Link href={`/interviews/${alert.interviewId}`} className="font-mono text-brand-700 hover:underline">
                    {alert.interviewId}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
