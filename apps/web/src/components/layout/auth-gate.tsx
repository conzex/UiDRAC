'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated, readStoredUser } from '@/lib/auth-client';
import { canAccessAdminPanel, canReadApp } from '@/lib/rbac';

type AuthGateProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export default function AuthGate({ children, requireAdmin }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(false);
    if (!isAuthenticated()) {
      const next = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?next=${next}`);
      return;
    }
    const user = readStoredUser();
    if (!canReadApp(user?.role)) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && !canAccessAdminPanel(user?.role)) {
      router.replace('/dashboard');
      return;
    }
    setAllowed(true);
  }, [pathname, requireAdmin, router]);

  if (!allowed) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-text-secondary">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
