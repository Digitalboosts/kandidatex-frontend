import { ScreenShare } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/** Spread onto an element to fade it in as it scrolls into view (see RevealOnScroll). */
export const reveal = (delayMs = 0) => ({
  'data-reveal': '',
  style: { '--reveal-delay': `${delayMs}ms` } as CSSProperties,
});

export function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
      aria-label="Interview Monitor home"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset]">
        <ScreenShare className="size-4" aria-hidden />
      </span>
      <span className={`font-semibold tracking-tight ${tone === 'light' ? 'text-white' : 'text-ink'}`}>Interview Monitor</span>
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'dark',
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  tone?: 'dark' | 'light';
  id?: string;
}) {
  const centered = align === 'center';
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'} {...reveal()}>
      <p className={`text-sm font-semibold ${tone === 'light' ? 'text-brand-500' : 'text-brand-600'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl ${tone === 'light' ? 'text-white' : 'text-ink'}`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-base leading-7 text-pretty sm:text-lg ${tone === 'light' ? 'text-slate-300' : 'text-ink-soft'}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

const CTA_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2';

export const ctaClass = {
  primary: `${CTA_BASE} bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 focus-visible:outline-brand-500`,
  /** A quiet button for dark backgrounds. */
  ghostLight: `${CTA_BASE} bg-white/5 text-white ring-1 ring-white/15 ring-inset hover:bg-white/10 focus-visible:outline-white`,
  secondary: `${CTA_BASE} bg-white text-ink ring-1 ring-line ring-inset hover:bg-canvas focus-visible:outline-brand-500`,
};
