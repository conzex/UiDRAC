'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/lib/auth-client';

/** Sends authenticated users away from login/register to the dashboard. */
export default function RedirectIfAuthenticated({ to = '/dashboard' }: { to?: string }) {
  const router = useRouter();
  const { loggedIn, ready } = useAuthUser();

  useEffect(() => {
    if (ready && loggedIn) router.replace(to);
  }, [ready, loggedIn, router, to]);

  return null;
}
