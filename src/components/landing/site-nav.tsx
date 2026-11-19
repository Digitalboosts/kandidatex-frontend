import Link from 'next/link';
import { MobileMenu } from './mobile-menu';
import { Logo, ctaClass } from './primitives';

export const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

export function SiteNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/90 backdrop-blur-lg supports-[backdrop-filter]:bg-navy-950/80">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo tone="light" />
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link href="/dashboard" className={ctaClass.primary}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Sign in
              </Link>
              <Link href="/register" className={ctaClass.primary}>
                Get started
              </Link>
            </>
          )}
        </div>
        <MobileMenu links={NAV_LINKS} signedIn={signedIn} />
      </nav>
    </header>
  );
}
