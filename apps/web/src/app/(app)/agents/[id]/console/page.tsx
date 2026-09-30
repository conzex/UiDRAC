'use client';

import { useParams, useRouter } from 'next/navigation';
import { AgentConsolePanel } from '@/components/agent/agent-console-panel';
import AppPageHeader from '@/components/layout/app-page-header';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import { ArrowLeft } from 'lucide-react';

export default function AgentConsolePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <AppPageHeader
        title={`${UIDRAC_AGENT_NAME} console`}
        description="Per-agent cloud connection and iDRAC LAN activity"
        className="mb-4 shrink-0"
        actions={
          <button
            type="button"
            onClick={() => router.push(`/agents?manage=${id}`)}
            className="h-9 px-4 text-sm font-semibold border border-border-card rounded bg-white hover:bg-row-hover inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Manage agent
          </button>
        }
      />
      <div className="flex-1 min-h-0 flex flex-col">
        {id && <AgentConsolePanel agentId={id} fullPage />}
      </div>
    </div>
  );
}
