'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated, readStoredUser } from '@/lib/auth-client';
import { canAccessAdminPanel, canReadApp } from '@/lib/rbac';
import AppPreloader from '@/components/layout/app-preloader';

type AuthGateProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export default function AuthGate({ children, requireAdmin }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setAllowed(false);
      const next = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?next=${next}`);
      return;
    }
    const user = readStoredUser();
    if (!canReadApp(user?.role)) {
      setAllowed(false);
      router.replace('/login');
      return;
    }
    if (requireAdmin && !canAccessAdminPanel(user?.role)) {
      setAllowed(false);
      router.replace('/dashboard');
      return;
    }
    setAllowed(true);
  }, [pathname, requireAdmin, router]);

  if (allowed !== true) {
    return <AppPreloader label="Checking session…" />;
  }

  return <>{children}</>;
}
