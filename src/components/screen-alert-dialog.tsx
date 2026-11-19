'use client';

import type { MonitoringEventDTO, ScreenAlertDTO, ScreenAppCategory } from '@/types';
import { Circle, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatDateTime, formatTime } from '@/lib/format';
import { CATEGORY_LABELS } from './screen-app-panel';
import { Button } from './ui';

/** What the popup shows. Built from an analyzer response, or from a timeline event for other viewers. */
export interface ScreenAlert {
  id: string;
  at: string;
  application: string | null;
  category?: ScreenAppCategory;
  message: string;
  activity?: string;
  confidence?: number;
  /** The analysed frame: a data URL this browser sent, or the stored screenshot's same-origin URL. */
  image?: string;
  /** Show the date as well as the time, for alerts from earlier days. */
  showDate?: boolean;
}

/** A HIGH alert the server stored, with its screenshot. */
export const fromStoredAlert = (alert: ScreenAlertDTO): ScreenAlert => ({
  id: alert.id,
  at: alert.createdAt,
  application: alert.application,
  category: alert.category,
  message: alert.message,
  activity: alert.activity,
  confidence: alert.confidence,
  image: alert.imageUrl,
  showDate: true,
});

/** A `screen_app_review` timeline event. Its metadata links to the stored alert and screenshot. */
export function fromReviewEvent(event: MonitoringEventDTO): ScreenAlert {
  const metadata = event.metadata ?? {};
  const text = (key: string) => (typeof metadata[key] === 'string' ? (metadata[key] as string) : undefined);
  const alertId = text('screenAlertId');
  return {
    id: event.id,
    at: event.createdAt,
    application: text('application') ?? null,
    category: text('category') as ScreenAppCategory | undefined,
    message: event.message,
    confidence: typeof metadata.confidence === 'number' ? metadata.confidence : undefined,
    image: alertId ? `/api/screen-alerts/${encodeURIComponent(alertId)}/image` : undefined,
  };
}

/**
 * Popup for a suspicious screen (an AI "review recommended" reading). It asks
 * the interviewer to look; it never says the candidate cheated.
 */
export function ScreenAlertDialog({
  alert,
  onClose,
  onRecord,
}: {
  alert: ScreenAlert | null;
  onClose: () => void;
  /** Shown as a button when recording is available and not yet running. */
  onRecord?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (alert && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first control (the close icon); the main button is the better start.
      confirmRef.current?.focus();
    }
    if (!alert && dialog.open) dialog.close();
  }, [alert]);

  return (
    <dialog
      ref={dialogRef}
      data-testid="screen-alert-dialog"
      aria-labelledby="screen-alert-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
    >
      {alert ? (
        <div>
          <div className="flex items-start gap-3 bg-red-50 px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-bad">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="screen-alert-title" className="text-base font-semibold text-bad">
                Unusual screen activity
              </h2>
              <p className="text-sm text-ink-soft">Review recommended · {alert.showDate ? formatDateTime(alert.at) : formatTime(alert.at)}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-muted hover:bg-red-100 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {alert.image ? (
            // A data URL of the analysed frame: next/image adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={alert.image}
              src={alert.image}
              alt="The frame that was analysed"
              className="aspect-video w-full bg-slate-900 object-contain"
              // A missing screenshot shouldn't leave a broken-image box.
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : null}

          <div className="space-y-3 px-5 py-4">
            {alert.application ? (
              <div className="flex flex-wrap items-center gap-2">
                <p data-testid="screen-alert-app" className="text-xl font-semibold tracking-tight">
                  {alert.application}
                </p>
                {alert.category ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                    {CATEGORY_LABELS[alert.category] ?? alert.category}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p className="text-sm">{alert.message}</p>
            {alert.activity && alert.activity !== alert.message ? (
              <p className="text-sm text-ink-soft">{alert.activity}</p>
            ) : null}
            {alert.confidence !== undefined ? (
              <div>
                <div className="mb-1 flex justify-between text-xs text-ink-muted">
                  <span>AI confidence</span>
                  <span className="tabular-nums">{Math.round(alert.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-bad" style={{ width: `${Math.round(alert.confidence * 100)}%` }} />
                </div>
              </div>
            ) : null}
            <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">
              This is an AI reading of a camera frame. It is a prompt to look at the candidate&apos;s screen, not proof of
              wrongdoing.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
            {onRecord ? (
              <Button
                variant="secondary"
                onClick={() => {
                  onRecord();
                  onClose();
                }}
              >
                <Circle className="size-3.5 fill-bad text-bad" aria-hidden /> Start recording
              </Button>
            ) : null}
            <Button ref={confirmRef} onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
