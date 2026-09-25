'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAddServerModal } from '@/components/servers/add-server-modal-context';

/** Legacy route — opens add-server modal and returns to dashboard. */
export default function AddServerRedirectPage() {
  const router = useRouter();
  const { openAddServer } = useAddServerModal();

  useEffect(() => {
    openAddServer();
    router.replace('/dashboard');
  }, [openAddServer, router]);

  return null;
}
