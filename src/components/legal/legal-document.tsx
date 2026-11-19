import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/landing/closing';
import { inter } from '@/components/landing/fonts';
import { SiteNav } from '@/components/landing/site-nav';
import { LEGAL, LEGAL_IS_DRAFT, LEGAL_LABELS, type LegalField } from './legal-config';

/** A business detail from legal-config, or a highlighted placeholder while it's missing. */
export function Fill({ field }: { field: LegalField }) {
  const value = LEGAL[field];
  if (value) return <>{value}</>;
  return (
    <mark className="rounded bg-amber-100 px-1 font-medium text-warn" title="Fill this in src/components/legal/legal-config.ts">
      [{LEGAL_LABELS[field]}]
    </mark>
  );
}

/** An email address from legal-config as a mailto link, or its placeholder. */
export function FillEmail({ field }: { field: LegalField }) {
  const value = LEGAL[field];
  if (!value) return <Fill field={field} />;
  return <a href={`mailto:${value}`}>{value}</a>;
}

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export function LegalDocument({
  signedIn,
  title,
  intro,
  sections,
  related,
}: {
  signedIn: boolean;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  related: { href: string; label: string };
}) {
  return (
    <div className={`landing-page bg-navy-950 ${inter.className}`}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteNav signedIn={signedIn} />

      <header className="relative isolate overflow-hidden bg-navy-950 pb-14 pt-16 sm:pb-20 sm:pt-20">
        <div aria-hidden className="landing-grid absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="absolute left-1/2 top-[-14rem] -z-10 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(37_99_235/0.28),transparent)]"
        />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-brand-500">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-slate-400">
            Effective <Fill field="effectiveDate" />
          </p>
        </div>
      </header>

      <main id="main" className="bg-white">
        {LEGAL_IS_DRAFT ? (
          <div className="border-b border-amber-200 bg-amber-50">
            <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-3 text-sm text-warn sm:px-6">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-semibold">Draft.</strong> Highlighted details still need to be filled in, and
                this page should be reviewed by a lawyer before it&rsquo;s relied on.
              </span>
            </p>
          </div>
        ) : null}

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">On this page</p>
            <ol className="mt-4 space-y-1 border-l border-line text-sm">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent py-1 pl-4 text-ink-soft hover:border-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    <span className="tabular-nums text-ink-muted">{index + 1}.</span> {section.title}
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-ink-soft">
              See also:{' '}
              <Link href={related.href} className="font-medium text-brand-700 hover:underline">
                {related.label}
              </Link>
            </p>
          </nav>

          <article className="legal-prose max-w-3xl">
            <div className="legal-intro">{intro}</div>
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`}>
                  <span className="tabular-nums text-ink-muted">{index + 1}.</span> {section.title}
                </h2>
                {section.body}
              </section>
            ))}
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
