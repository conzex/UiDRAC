'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
        description="Per-agent cloud connection, live log, and iDRAC activity (portal only)"
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
      <div className="flex-1 min-h-0 overflow-y-auto">
        {id && <AgentConsolePanel agentId={id} />}
        <p className="text-center text-xs text-text-secondary mt-4">
          <Link href="/agents" className="text-dell-blue font-semibold hover:underline">Back to Agents</Link>
        </p>
      </div>
    </div>
  );
}
