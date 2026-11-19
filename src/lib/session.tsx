'use client';

import type { UserDTO } from '@/types';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { api } from './api';

const SessionContext = createContext<UserDTO | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  useEffect(() => {
    api<{ user: UserDTO }>('/api/auth/me')
      .then(({ user: current }) => setUser(current))
      .catch(() => undefined);
  }, []);
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export const useSessionUser = () => useContext(SessionContext);
