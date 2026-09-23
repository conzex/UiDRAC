'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlatformRole } from '@/lib/rbac';
import { hasMinRole } from '@/lib/rbac';
import { readStoredUser } from '@/lib/auth-client';

type RequireMinRoleProps = {
  minimum: PlatformRole;
  children: React.ReactNode;
  redirectTo?: string;
};

/** Client route guard — complements API RBAC for direct URL access. */
export default function RequireMinRole({ minimum, children, redirectTo = '/dashboard' }: RequireMinRoleProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const user = readStoredUser();
    if (!hasMinRole(user?.role, minimum)) {
      router.replace(redirectTo);
      return;
    }
    setAllowed(true);
  }, [minimum, redirectTo, router]);

  if (!allowed) {
    return (
      <div className="py-12 text-center text-sm text-text-secondary">
        Checking permissions…
      </div>
    );
  }

  return <>{children}</>;
}
