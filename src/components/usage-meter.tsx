import type { InterviewQuota } from '@/types';

/** Bar colour by how much of the month's interviews are used. */
function barTone(quota: InterviewQuota): string {
  if (quota.included === 0 || quota.remaining === 0) return 'bg-bad';
  return quota.remaining / quota.included <= 0.1 ? 'bg-warn' : 'bg-brand-600';
}

/** "37 / 100 interviews used" with a progress bar. */
export function UsageMeter({ quota, size = 'md' }: { quota: InterviewQuota; size?: 'sm' | 'md' }) {
  const percent = quota.included > 0 ? Math.min(100, Math.round((quota.used / quota.included) * 100)) : 100;
  return (
    <div>
      <div className={`flex items-baseline justify-between gap-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        <span>
          <span data-testid="usage-used" className="font-semibold tabular-nums">
            {quota.used}
          </span>
          <span className="text-ink-muted"> / {quota.included} interviews used</span>
        </span>
        {size === 'md' ? (
          <span className="tabular-nums text-ink-muted">{quota.remaining} left</span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label="Interviews used this month"
        aria-valuemin={0}
        aria-valuemax={quota.included}
        aria-valuenow={quota.used}
        className={`mt-1.5 overflow-hidden rounded-full bg-slate-100 ${size === 'sm' ? 'h-1' : 'h-2'}`}
      >
        <div className={`h-full rounded-full ${barTone(quota)}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
