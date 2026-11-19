'use client';

import { CreditCard, Film, LayoutDashboard, LogOut, ScreenShare, TriangleAlert, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useSessionUser } from '@/lib/session';
import { useSubscription } from '@/lib/subscription';
import { UsageMeter } from './usage-meter';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/interviews', label: 'Interviews', icon: Video },
  { href: '/recordings', label: 'Recordings', icon: Film },
  { href: '/alerts', label: 'Screen alerts', icon: TriangleAlert },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

/** Interviews left this month, or a nudge to subscribe. Links to billing. */
function PlanWidget() {
  const { me, unlimited } = useSubscription();
  if (unlimited || !me) return null;
  return (
    <Link
      href="/billing"
      data-testid="plan-widget"
      className="mx-3 mb-3 hidden rounded-lg border border-line p-3 hover:bg-canvas md:block"
    >
      {me.subscribed ? (
        <>
          <p className="mb-1.5 text-xs font-medium text-ink-soft">
            {me.interviews.remaining === 0 ? 'Monthly limit reached' : `${me.interviews.remaining} interviews left`}
          </p>
          <UsageMeter quota={me.interviews} size="sm" />
        </>
      ) : (
        <>
          <p className="text-xs font-medium">No active plan</p>
          <p className="mt-0.5 text-xs text-brand-700">Subscribe to create interviews →</p>
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useSessionUser();

  async function signOut() {
    await api('/api/auth/logout', { body: {} }).catch(() => undefined);
    // A full navigation, so no signed-in client state survives.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }

  return (
    <aside className="flex shrink-0 border-b border-line bg-white md:sticky md:top-0 md:h-screen md:w-60 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-4 md:px-5 md:py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <ScreenShare className="size-4" aria-hidden />
        </span>
        <span className="hidden font-semibold tracking-tight sm:inline">Interview Monitor</span>
      </div>
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 md:flex-col md:items-stretch md:overflow-visible md:px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              title={label}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-canvas'
              }`}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only md:not-sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
      <PlanWidget />
      <div className="flex items-center gap-2 px-3 md:border-t md:border-line md:p-4">
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-medium">{user?.name ?? ' '}</p>
          <p className="truncate text-xs text-ink-muted">{user?.role === 'ADMIN' ? 'Administrator' : 'Interviewer'}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-lg p-2 text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
