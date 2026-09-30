'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Deep links open the portal agent console for this agent. */
export default function AgentDetailRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) router.replace(`/agents/${id}/console`);
    else router.replace('/agents');
  }, [id, router]);

  return null;
}
