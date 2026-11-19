'use client';

import type { InterviewDTO } from '@/types';
import { CreditCard, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, buttonClass, Card, ErrorNote, Field, PageHeader, StatusBadge } from '@/components/ui';
import { api, ApiRequestError, errorMessage } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { useSubscription } from '@/lib/subscription';

/** Why a new interview can't be created, with a way forward. Also used for the server's 402 answers. */
function PlanBlocker({ reason, resetsOn }: { reason: 'subscription_required' | 'interview_limit_reached'; resetsOn?: string | null }) {
  return (
    <div
      data-testid="plan-blocker"
      className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-warn">
          {reason === 'subscription_required' ? 'Subscribe to create interviews' : 'Monthly interview limit reached'}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {reason === 'subscription_required'
            ? 'Your existing interviews stay available. A plan is needed to create new ones.'
            : `You've used every interview included this month.${resetsOn ? ` The count resets on ${formatDate(resetsOn)}.` : ''}`}
        </p>
      </div>
      <Link href="/billing" className={buttonClass(reason === 'subscription_required' ? 'primary' : 'secondary')}>
        <CreditCard className="size-4" aria-hidden /> {reason === 'subscription_required' ? 'View plan' : 'Billing'}
      </Link>
    </div>
  );
}

function CreateInterview({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { me, refresh } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<'subscription_required' | 'interview_limit_reached' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get('scheduledAt') ?? '');
    setSubmitting(true);
    setError(null);
    setBlocked(null);
    try {
      const { interview } = await api<{ interview: InterviewDTO }>('/api/interviews', {
        body: {
          title: form.get('title'),
          candidateName: form.get('candidateName'),
          scheduledAt: scheduled ? new Date(scheduled).toISOString() : null,
        },
      });
      void refresh();
      router.push(`/interviews/${interview.id}`);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 402) {
        setBlocked(caught.code === 'interview_limit_reached' ? 'interview_limit_reached' : 'subscription_required');
        void refresh();
      } else {
        setError(errorMessage(caught));
      }
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-4 font-semibold">New interview</h2>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
        <Field label="Title" name="title" placeholder="Senior backend engineer" required />
        <Field
          label="Candidate name"
          name="candidateName"
          placeholder="Full name"
          hint="The candidate must enter this name to join."
          required
        />
        <Field label="Scheduled for (optional)" name="scheduledAt" type="datetime-local" />
        <div className="flex gap-2 md:col-span-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create interview'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="md:col-span-3">
          <ErrorNote message={error} />
          {blocked ? <PlanBlocker reason={blocked} resetsOn={me?.subscription?.currentPeriodEnd} /> : null}
        </div>
      </form>
    </Card>
  );
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { me, canCreateInterview } = useSubscription();
  const blockedReason = canCreateInterview
    ? null
    : me?.subscribed
      ? ('interview_limit_reached' as const)
      : ('subscription_required' as const);

  useEffect(() => {
    api<{ interviews: InterviewDTO[] }>('/api/interviews')
      .then((body) => setInterviews(body.interviews))
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  return (
    <>
      <PageHeader
        title="Interviews"
        description="Create interviews and share the joining link with candidates."
        action={
          creating ? null : (
            <Button onClick={() => setCreating(true)} disabled={blockedReason !== null}>
              <Plus className="size-4" aria-hidden /> New interview
            </Button>
          )
        }
      />
      {blockedReason ? <PlanBlocker reason={blockedReason} resetsOn={me?.subscription?.currentPeriodEnd} /> : null}
      {creating && !blockedReason ? <CreateInterview onCancel={() => setCreating(false)} /> : null}
      <ErrorNote message={error} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Interview</th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {interviews?.map((interview) => (
              <tr key={interview.id} className="hover:bg-canvas">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/interviews/${interview.id}`} className="text-brand-700 hover:underline">
                    {interview.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{interview.candidateName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={interview.status} />
                </td>
                <td className="px-4 py-3 text-ink-soft">{formatDateTime(interview.scheduledAt)}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{interview.id}</td>
              </tr>
            ))}
            {interviews?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No interviews yet. Create one to get a joining link.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}
