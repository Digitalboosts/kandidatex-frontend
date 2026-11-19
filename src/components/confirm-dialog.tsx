'use client';

import { type LucideIcon, Power } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api';
import { Button, ErrorNote } from './ui';

/**
 * A confirmation popup in the app's style, in place of the browser's
 * `confirm()`. While `onConfirm` runs the buttons are disabled; if it throws,
 * the error shows inside the dialog and it stays open.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  busyLabel,
  icon: Icon = Power,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  /** Extra notes under the description, such as what happens to a running recording. */
  details?: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  icon?: LucideIcon;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start on the safe choice, so Enter doesn't end anything by accident.
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function cancel() {
    if (busy) return;
    setError(null);
    onCancel();
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      data-testid="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => {
        // Esc: close through our state, and not while the action is running.
        event.preventDefault();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex gap-4 px-6 pb-5 pt-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-bad">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="confirm-dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          <div id="confirm-dialog-description" className="mt-1 text-sm text-ink-soft">
            {description}
          </div>
          {details ? <div className="mt-3">{details}</div> : null}
          {error ? (
            <div className="mt-3">
              <ErrorNote message={error} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 rounded-b-2xl border-t border-line bg-canvas px-6 py-3">
        <Button ref={cancelRef} variant="secondary" onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} disabled={busy} data-testid="confirm-dialog-confirm">
          {busy ? (busyLabel ?? 'Working…') : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
