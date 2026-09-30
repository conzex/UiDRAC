'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Deep link — open add-server flow on the Servers page. */
export default function AddServerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/servers?add=1');
  }, [router]);

  return null;
}
