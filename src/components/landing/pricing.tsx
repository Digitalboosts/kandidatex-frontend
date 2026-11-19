import { Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { CountUp } from './count-up';
import { FALLBACK_PLAN, getLandingPlan, type LandingPlan } from './plan';
import { SectionHeading, ctaClass, reveal } from './primitives';

const INCLUDED = [
  'Live view of the candidate’s screen through their phone camera',
  'Guided calibration for framing, lighting, focus and stability',
  'AI screen analysis at random moments, 1–10 s apart',
  '“Unusual screen activity” popups with screenshot alerts',
  'One-click session recording with playback and seeking',
  'Event timeline, AI summary and a full report per interview',
  'Private storage, visible only to the interview’s owner',
];

/** "₹10,000" → { prefix: "₹", value: 10000, suffix: "" }, or null if it isn't a plain number. */
function splitAmount(display: string) {
  const match = /^(\D*?)\s*([\d,]+)(\D*)$/.exec(display.trim());
  if (!match) return null;
  const value = Number(match[2]!.replaceAll(',', ''));
  return Number.isFinite(value) ? { prefix: match[1]!, value, suffix: match[3]! } : null;
}

function perInterview(plan: LandingPlan): string | null {
  const rupees = plan.amount !== undefined ? plan.amount / 100 : splitAmount(plan.amountDisplay)?.value;
  if (rupees === undefined || !plan.interviewsPerPeriod) return null;
  const each = rupees / plan.interviewsPerPeriod;
  if (each <= 0) return null;
  return `₹${each.toLocaleString('en-IN', each < 10 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })}`;
}

function PlanCard({ plan, signedIn }: { plan: LandingPlan; signedIn: boolean }) {
  const amount = splitAmount(plan.amountDisplay);
  const each = perInterview(plan);
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="relative grid overflow-hidden rounded-3xl bg-white ring-1 ring-line shadow-2xl shadow-navy-950/10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="relative overflow-hidden bg-navy-950 p-8 text-white sm:p-10">
          <div
            aria-hidden
            className="absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(37_99_235/0.45),transparent)]"
          />
          <p className="relative inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15">
            One plan, everything included
          </p>
          <h3 className="relative mt-5 text-xl font-semibold">{plan.name}</h3>
          <p className="relative mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight">
              {amount ? (
                <>
                  {amount.prefix}
                  <CountUp value={amount.value} />
                  {amount.suffix}
                </>
              ) : (
                plan.amountDisplay
              )}
            </span>
            <span className="text-slate-400">/ month</span>
          </p>
          <p className="relative mt-3 text-sm text-slate-300">
            <span className="font-semibold text-white">
              <CountUp value={plan.interviewsPerPeriod} /> interviews
            </span>{' '}
            every month{each ? ` · about ${each} each` : ''}
          </p>
          <Link href={signedIn ? '/billing' : '/register'} className={`${ctaClass.primary} relative mt-8 w-full py-3`}>
            {signedIn ? 'Go to billing' : 'Get started'}
          </Link>
          <p className="relative mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden />
            Secure payments by Razorpay · renews monthly · count resets each month
          </p>
        </div>
        <div className="p-8 sm:p-10">
          <p className="text-sm font-semibold text-ink">What&rsquo;s included</p>
          <ul className="mt-5 space-y-3.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

async function LivePlanCard({ signedIn }: { signedIn: boolean }) {
  const plan = await getLandingPlan();
  return <PlanCard plan={plan} signedIn={signedIn} />;
}

export function Pricing({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-canvas py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="pricing-title"
          eyebrow="Pricing"
          title="One simple plan"
          description="Every feature, one monthly price. No tiers to compare."
        />
        <div className="mt-14" {...reveal(80)}>
          {/* The page streams immediately with the published price; the live price replaces it if the API answers. */}
          <Suspense fallback={<PlanCard plan={FALLBACK_PLAN} signedIn={signedIn} />}>
            <LivePlanCard signedIn={signedIn} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
