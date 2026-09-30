'use client';

import { useParams, useRouter } from 'next/navigation';
import { AgentSitePanel } from '@/components/agent/agent-site-panel';

export default function AgentConsolePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {id && (
        <AgentSitePanel agentId={id} fullPage onBack={() => router.push('/agents')} />
      )}
    </div>
  );
}
