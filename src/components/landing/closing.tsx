import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Faq } from './faq';
import { FAQ_ITEMS } from './faq-data';
import { Logo, SectionHeading, ctaClass, reveal } from './primitives';

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t border-line bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12" {...reveal(80)}>
          <Faq items={FAQ_ITEMS} />
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-navy-950 py-24 sm:py-32">
      <div aria-hidden className="landing-grid absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-[30rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(37_99_235/0.35),transparent)]"
      />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6" {...reveal()}>
        <h2 id="cta-title" className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
          Your next remote round, with the whole screen in view.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          Create an interview, share the link, and watch the screen live. One plan covers every feature.
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href={signedIn ? '/dashboard' : '/register'} className={`${ctaClass.primary} px-6 py-3`}>
            {signedIn ? 'Open dashboard' : 'Get started'}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a href="#pricing" className={`${ctaClass.ghostLight} px-6 py-3`}>
            See pricing
          </a>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINKS = [
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/login', label: 'Sign in' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-navy-950 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo tone="light" />
          <p className="mt-3 text-sm leading-6">Live screen monitoring for remote technical interviews, with a human in every decision.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                {link.href.startsWith('/#') ? (
                  <a href={link.href} className="hover:text-white focus-visible:outline-2 focus-visible:outline-white">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} className="hover:text-white focus-visible:outline-2 focus-visible:outline-white">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs sm:px-6">© {year} Kandidatex. All rights reserved.</p>
      </div>
    </footer>
  );
}
