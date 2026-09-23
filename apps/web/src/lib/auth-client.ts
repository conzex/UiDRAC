/** Client-side auth storage and sync (JWT in localStorage). */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { PlatformRole } from './rbac';
import { canReadApp } from './rbac';

export type StoredUser = {
  id?: string;
  email?: string;
  role?: PlatformRole | string;
  tenantId?: string;
};

export const AUTH_CHANGE_EVENT = 'idrac-auth-change';

export function readStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function readAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function isAuthenticated(): boolean {
  return !!readAccessToken();
}

export function notifyAuthChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthStorage(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  notifyAuthChange();
}

export function persistAuth(accessToken: string, user: StoredUser): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  notifyAuthChange();
}

export function useAuthUser() {
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setUser(readStoredUser());
    setHasToken(!!readAccessToken());
    setReady(true);
  }, []);

  useEffect(() => {
    sync();
  }, [pathname, sync]);

  useEffect(() => {
    const onAuth = () => sync();
    window.addEventListener('storage', onAuth);
    window.addEventListener(AUTH_CHANGE_EVENT, onAuth);
    return () => {
      window.removeEventListener('storage', onAuth);
      window.removeEventListener(AUTH_CHANGE_EVENT, onAuth);
    };
  }, [sync]);

  const loggedIn = hasToken && canReadApp(user?.role);
  const loggedInOrToken = hasToken || !!user?.email;

  return { user, hasToken, loggedIn, loggedInOrToken, ready, sync };
}
