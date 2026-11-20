'use client';

import type { CheckoutResponse, PlanDTO, SubscriptionDTO, SubscriptionStatus, TransactionDTO, VerifyPaymentResponse } from '@/types';
import { CircleCheck, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, ErrorNote, PageHeader } from '@/components/ui';
import { UsageMeter } from '@/components/usage-meter';
import { api, ApiRequestError, errorMessage } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { CheckoutDismissed, openOrderCheckout } from '@/lib/razorpay';
import { useSessionUser } from '@/lib/session';
import { useSubscription } from '@/lib/subscription';

const POLL_MS = 3000;
/** After this, stop polling and tell the user the payment is still being confirmed. */
const POLL_GIVE_UP_MS = 2 * 60_000;

const STATUS: Record<SubscriptionStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-good' },
  CREATED: { label: 'Awaiting payment', className: 'bg-slate-100 text-ink-soft' },
  PENDING: { label: 'Payment pending', className: 'bg-amber-50 text-warn' },
  HALTED: { label: 'Payment failed', className: 'bg-red-50 text-bad' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-ink-soft' },
  COMPLETED: { label: 'Completed', className: 'bg-slate-100 text-ink-soft' },
  EXPIRED: { label: 'Expired', className: 'bg-slate-100 text-ink-soft' },
  PAUSED: { label: 'Paused', className: 'bg-amber-50 text-warn' },
};

/** "30 days": how long one payment lasts. */
const periodLabel = (plan: PlanDTO) => `${plan.durationDays} days`;

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const { label, className } = STATUS[status] ?? STATUS.CREATED;
  return (
    <span data-testid="subscription-status" className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function PlanOffer({ plan, busy, onSubscribe }: { plan: PlanDTO; busy: boolean; onSubscribe: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-brand-50 px-6 py-5">
        <p className="text-sm font-medium text-brand-700">{plan.name}</p>
        <p className="mt-1">
          <span data-testid="plan-price" className="text-3xl font-semibold tracking-tight">
            {plan.amountDisplay}
          </span>
          <span className="text-sm text-ink-soft"> / {periodLabel(plan)}</span>
        </p>
      </div>
      <div className="space-y-4 px-6 py-5">
        <p className="text-sm text-ink-soft">{plan.description}</p>
        <ul className="space-y-2 text-sm">
          {[
            `${plan.interviewsPerPeriod} monitored interviews for ${periodLabel(plan)}`,
            'Live monitoring, AI screen alerts and recordings',
            'AI summary and report for every interview',
            'One-time payment, no auto-renewal',
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>
        <Button onClick={onSubscribe} disabled={busy} className="w-full" data-testid="subscribe">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
          {busy ? 'Opening checkout…' : `Pay ${plan.amountDisplay} for ${periodLabel(plan)}`}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="size-3.5" aria-hidden /> Payments are handled securely by Razorpay.
        </p>
      </div>
    </Card>
  );
}

function CurrentPlan({ subscription }: { subscription: SubscriptionDTO }) {
  const { plan, status, active, currentPeriodStart, currentPeriodEnd, interviews } = subscription;
  const endingAfterCancel = status === 'CANCELLED' && active;
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">Current plan</p>
          <p className="mt-0.5 text-lg font-semibold">{plan.name}</p>
          <p className="text-sm text-ink-soft">
            {plan.amountDisplay} / {periodLabel(plan)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {active ? (
        <div className="mt-5">
          <UsageMeter quota={interviews} />
          <p className="mt-2 text-xs text-ink-muted">
            {endingAfterCancel
              ? `Your plan was cancelled. It keeps working until ${formatDate(currentPeriodEnd)}.`
              : `Valid ${formatDate(currentPeriodStart)} – ${formatDate(currentPeriodEnd)}. It doesn’t renew by itself; pay again after ${formatDate(currentPeriodEnd)} to continue.`}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">
          {status === 'EXPIRED' || status === 'COMPLETED'
            ? 'This plan has ended, so you can’t create new interviews. Pay again to continue.'
            : 'This plan is not active, so you can’t create new interviews.'}
        </p>
      )}
    </Card>
  );
}

const TRANSACTION_STATUS: Record<TransactionDTO['status'], string> = {
  CAPTURED: 'bg-green-50 text-good',
  FAILED: 'bg-red-50 text-bad',
};

function Transactions({ transactions }: { transactions: TransactionDTO[] }) {
  return (
    <Card className="overflow-x-auto">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Payment history</h2>
      {transactions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">No payments yet.</p>
      ) : (
        <table data-testid="transactions" className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-4 py-3">{formatDateTime(transaction.createdAt)}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{transaction.amountDisplay}</td>
                <td className="px-4 py-3 uppercase text-ink-soft">{transaction.method ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TRANSACTION_STATUS[transaction.status]}`}>
                    {transaction.status === 'CAPTURED' ? 'Paid' : 'Failed'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{transaction.razorpayPaymentId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default function BillingPage() {
  const user = useSessionUser();
  const { me, unlimited, refresh } = useSubscription();
  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [busy, setBusy] = useState<'checkout' | 'verifying' | null>(null);
  const [processingSince, setProcessingSince] = useState<number | null>(null);
  const [stillProcessing, setStillProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ plan: PlanDTO }>('/api/subscription/plan')
      .then((body) => setPlan(body.plan))
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  // A "pending" payment: poll until the server says the plan is active.
  useEffect(() => {
    if (processingSince === null) return;
    const timer = setInterval(async () => {
      const next = await refresh();
      if (next?.subscribed) {
        setProcessingSince(null);
        setSuccess(true);
      } else if (Date.now() - processingSince > POLL_GIVE_UP_MS) {
        setProcessingSince(null);
        setStillProcessing(true);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [processingSince, refresh]);

  async function subscribe() {
    setError(null);
    setSuccess(false);
    setStillProcessing(false);
    setBusy('checkout');
    try {
      const checkout = await api<CheckoutResponse>('/api/subscription/checkout', { body: {} });
      const paid = await openOrderCheckout({
        keyId: checkout.keyId,
        orderId: checkout.orderId,
        amount: checkout.plan.amount,
        currency: checkout.plan.currency,
        description: checkout.plan.name,
        prefill: { name: user?.name, email: user?.email },
      });
      setBusy('verifying');
      const verified = await api<VerifyPaymentResponse>('/api/subscription/verify', {
        body: {
          razorpayPaymentId: paid.razorpay_payment_id,
          razorpayOrderId: paid.razorpay_order_id,
          razorpaySignature: paid.razorpay_signature,
        },
      });
      if (verified.status === 'active') {
        await refresh();
        setSuccess(true);
      } else {
        setProcessingSince(Date.now());
      }
    } catch (caught) {
      if (caught instanceof CheckoutDismissed) return;
      if (caught instanceof ApiRequestError && caught.code === 'already_subscribed') {
        await refresh();
        return;
      }
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  const subscription = me?.subscription ?? null;
  const showOffer = !unlimited && me !== null && !me.subscribed && processingSince === null;

  return (
    <>
      <PageHeader title="Billing" description="Your plan, interviews left this month and payment history." />
      <div className="space-y-4">
        <ErrorNote message={error} />
        {success ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-good">
            <CircleCheck className="size-4" aria-hidden /> Payment received. Your plan is active; a receipt is on its way by
            email.
          </p>
        ) : null}
        {busy === 'verifying' || processingSince !== null ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Payment processing. This page updates by itself once it
            is confirmed.
          </p>
        ) : null}
        {stillProcessing ? (
          <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn">
            The payment is still being confirmed by the bank. Check back in a few minutes; you don&apos;t need to pay
            again.
          </p>
        ) : null}
        {unlimited ? (
          <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">
            You&apos;re an administrator, so interviews aren&apos;t limited by a plan.
          </p>
        ) : null}

        {me === null && !unlimited ? <p className="text-sm text-ink-muted">Loading…</p> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {subscription ? <CurrentPlan subscription={subscription} /> : null}
          {showOffer && plan ? <PlanOffer plan={plan} busy={busy !== null} onSubscribe={subscribe} /> : null}
        </div>

        {me ? <Transactions transactions={me.transactions} /> : null}
      </div>
    </>
  );
}
