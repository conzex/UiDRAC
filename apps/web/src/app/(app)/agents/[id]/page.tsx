'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Deep links open the unified agent panel (manage modal). */
export default function AgentDetailRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) router.replace(`/agents?manage=${id}`);
    else router.replace('/agents');
  }, [id, router]);

  return null;
}
