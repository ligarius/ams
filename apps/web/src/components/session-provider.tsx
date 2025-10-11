'use client';

import { createContext, useContext, useMemo } from 'react';
import type { SessionUser } from '@/lib/auth/session';

interface SessionContextValue {
  user: SessionUser;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ user }), [user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de SessionProvider');
  }
  return context;
};
