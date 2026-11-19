'use client';

import type { SubscriptionMe } from '@/types';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useSessionUser } from './session';

interface SubscriptionContextValue {
  /** Null until loaded, or if loading failed. */
  me: SubscriptionMe | null;
  /** Admins aren't limited by the plan. */
  unlimited: boolean;
  /** May create an interview, as far as the client knows. The server still checks. */
  canCreateInterview: boolean;
  refresh: () => Promise<SubscriptionMe | null>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  me: null,
  unlimited: false,
  canCreateInterview: true,
  refresh: async () => null,
});

/** Loads GET /api/subscription/me once for the signed-in pages; pages call `refresh` after changes. */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const [me, setMe] = useState<SubscriptionMe | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api<SubscriptionMe>('/api/subscription/me');
      setMe(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(() => {
    const unlimited = user?.role === 'ADMIN';
    // Unknown (still loading or failed) doesn't block: the server answers 402 if needed.
    const canCreateInterview = unlimited || !me || (me.subscribed && me.interviews.remaining > 0);
    return { me, unlimited, canCreateInterview, refresh };
  }, [me, user?.role, refresh]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscription = () => useContext(SubscriptionContext);
