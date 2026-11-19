'use client';

import type { AnalyticsOverview } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SEVERITY_STYLES } from '@/components/event-timeline';
import { buttonClass, Card, ErrorNote, PageHeader } from '@/components/ui';
import { UsageMeter } from '@/components/usage-meter';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useSubscription } from '@/lib/subscription';

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value ?? '—'}</p>
    </Card>
  );
}

/** This month's interviews against the plan, from GET /api/subscription/me. */
function PlanUsage() {
  const { me, unlimited } = useSubscription();
  if (unlimited) return null;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Interviews this month</h2>
        <Link href="/billing" className="text-xs font-medium text-brand-700 hover:underline">
          Billing
        </Link>
      </div>
      {!me ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : me.subscribed ? (
        <>
          <UsageMeter quota={me.interviews} />
          <p className="mt-2 text-xs text-ink-muted">Resets on {formatDate(me.subscription?.currentPeriodEnd ?? null)}.</p>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">No active plan. Subscribe to create interviews.</p>
          <Link href="/billing" className={`${buttonClass()} mt-3 w-full`}>
            View plan
          </Link>
        </>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AnalyticsOverview>('/api/analytics/overview')
      .then(setData)
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  return (
    <>
      <PageHeader title="Overview" description="Your interviews at a glance." />
      <ErrorNote message={error} />
      <section aria-label="Interview totals" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total interviews" value={data?.totals.total} />
        <Stat label="Active" value={data?.totals.active} />
        <Stat label="Completed" value={data?.totals.completed} />
        <Stat label="Upcoming" value={data?.totals.upcoming} />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Interviews created per day, last 14 days</h2>
          <div className="h-56">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.interviewsByDay} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 12, fill: 'var(--color-ink-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-line)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'var(--color-ink-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-brand-50)' }}
                    labelFormatter={(label) => shortDate(String(label))}
                    formatter={(value) => [String(value), 'Interviews']}
                    contentStyle={{ borderRadius: 8, borderColor: 'var(--color-line)', fontSize: 13 }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Card>
        <div className="space-y-4">
        <PlanUsage />
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Monitoring events, last 14 days</h2>
          <ul className="space-y-3">
            {(data?.eventsBySeverity ?? []).map(({ severity, count }) => {
              const { icon: Icon, className, label } = SEVERITY_STYLES[severity];
              return (
                <li key={severity} className="flex items-center gap-3 text-sm">
                  <Icon className={`size-4 ${className}`} aria-hidden />
                  <span className="flex-1 text-ink-soft">{label}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        </Card>
        </div>
      </section>
    </>
  );
}
