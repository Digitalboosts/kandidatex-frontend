import { ScreenShare } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from '@/lib/candidate-camera';

export const TONE_TEXT: Record<Tone, string> = { good: 'text-good', warn: 'text-warn', bad: 'text-bad' };
export const TONE_FILL: Record<Tone, string> = { good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' };

export function StatusRow({ label, value, tone, testId }: { label: string; value: string; tone: Tone; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <span data-testid={testId} className={`flex items-center gap-2 font-semibold ${TONE_TEXT[tone]}`}>
        <span className={`size-2 rounded-full ${TONE_FILL[tone]}`} aria-hidden />
        {value}
      </span>
    </div>
  );
}

const NOTICE_STYLES: Record<'bad' | 'warn', string> = {
  bad: 'border-red-200 bg-red-50 text-bad',
  warn: 'border-amber-200 bg-amber-50 text-warn',
};

export function Notice({ text, tone = 'bad' }: { text: string; tone?: 'bad' | 'warn' }) {
  return (
    <p role="alert" className={`rounded-lg border px-3 py-2.5 text-sm leading-5 ${NOTICE_STYLES[tone]}`}>
      {text}
    </p>
  );
}

/** A narrow, phone-like column for the form steps, centred on larger screens. */
export function StepShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-dvh justify-center p-4 sm:items-center sm:p-6">
      <div className={`w-full ${wide ? 'max-w-5xl' : 'max-w-md'}`}>
        <div className="mb-5 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ScreenShare className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">Interview Monitor</span>
        </div>
        {children}
      </div>
    </main>
  );
}
