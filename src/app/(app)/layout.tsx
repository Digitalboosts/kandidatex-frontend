import type { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { SessionProvider } from '@/lib/session';
import { SubscriptionProvider } from '@/lib/subscription';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SubscriptionProvider>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </SubscriptionProvider>
    </SessionProvider>
  );
}
