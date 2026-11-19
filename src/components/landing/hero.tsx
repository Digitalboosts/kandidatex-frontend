import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { HeroMonitor } from './hero-monitor';
import { ctaClass } from './primitives';

/*
 * Headline options:
 *   1. "See the screen your webcam can't."                       <- used: short, visual, names the gap
 *   2. "Your webcam sees the candidate. Now see their screen."
 *   3. "Remote coding interviews, with the whole screen in view."
 */

const TRUST = ['Candidate consent first', 'No face recognition', 'Payments by Razorpay'];

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-navy-950 pt-16 sm:pt-24">
      <div aria-hidden className="landing-grid absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute left-1/2 top-[-18rem] -z-10 h-[44rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(37_99_235/0.32),rgb(37_99_235/0.08)_55%,transparent)]"
      />
      {/* The lower part of the mock sits on the light canvas, easing the page from dark to light. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-canvas sm:h-40" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="size-1.5 rounded-full bg-brand-500" aria-hidden />
            Built for remote technical interviews
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-4xl font-semibold tracking-tight text-balance text-white sm:text-6xl sm:leading-[1.05]"
          >
            See the screen your webcam can&rsquo;t.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-pretty text-slate-300 sm:text-lg sm:leading-8">
            The candidate points a phone at their laptop so you can watch that screen live, while AI names the app on
            screen and flags any AI assistant for your review.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href={signedIn ? '/dashboard' : '/register'} className={`${ctaClass.primary} px-6 py-3`}>
              {signedIn ? 'Open dashboard' : 'Get started'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#how-it-works" className={`${ctaClass.ghostLight} px-6 py-3`}>
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
            {TRUST.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 pb-10 sm:mt-20 sm:pb-16">
          <HeroMonitor />
        </div>
      </div>
    </section>
  );
}
