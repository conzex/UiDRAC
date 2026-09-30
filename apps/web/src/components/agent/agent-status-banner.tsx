'use client';

import Link from 'next/link';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import type { AgentStatus } from '@/lib/agent-client';
import { STATUS_LABEL } from '@/lib/agents-client';
import type { AgentConnectionState } from '@idrac/shared';

const btnClass =
  'inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded border shrink-0';

const STATE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  connected:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-900',  dot: 'bg-green-healthy' },
  disconnected: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-950',  dot: 'bg-amber-warning' },
  revoked:      { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-900',    dot: 'bg-red-critical' },
  disabled:     { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   dot: 'bg-gray-400' },
  offline:      { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-950',  dot: 'bg-amber-warning' },
  pending:      { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-900',   dot: 'bg-dell-blue' },
};

function getColors(state: string) {
  return STATE_COLORS[state] ?? STATE_COLORS.offline;
}

/** Dynamic fleet agent summary with status-based colors and labels. */
export function AgentStatusBanner({
  status,
  loading = false,
  error,
  showManageLink = true,
}: {
  status: AgentStatus | null;
  loading?: boolean;
  error?: string;
  showManageLink?: boolean;
}) {
  // Loading state
  if (loading && !status) {
    return (
      <div className="mb-4 px-3 py-2 rounded border flex items-center gap-3 text-xs sm:text-sm bg-gray-50 border-gray-200 text-text-secondary animate-pulse">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
        <p className="font-medium">{UIDRAC_AGENT_NAME}: Connecting…</p>
      </div>
    );
  }

  // Error / no status — show as offline dynamically
  if (!status) {
    const c = STATE_COLORS.offline;
    return (
      <div className={`mb-4 px-3 py-2 rounded border flex items-center gap-3 text-xs sm:text-sm ${c.bg} ${c.border} ${c.text}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{UIDRAC_AGENT_NAME}: Offline</p>
          {error && <p className="text-[11px] text-text-secondary mt-0.5 truncate">{error}</p>}
        </div>
        {showManageLink && (
          <Link href="/agents" className={`${btnClass} border-dell-blue/40 text-dell-blue bg-white hover:bg-dell-blue/5`}>
            Manage agents
          </Link>
        )}
      </div>
    );
  }

  const state = (status.status ?? (status.connected ? 'connected' : 'disconnected')) as AgentConnectionState;
  const c = getColors(state);

  const summary: string[] = [];
  if (status.lastConnectedAt) {
    summary.push(
      `Last seen ${new Date(status.lastConnectedAt).toLocaleString()}${status.lastSeenIp ? ` from ${status.lastSeenIp}` : ''}`,
    );
  }
  if (status.agentCount && status.agentCount > 1) {
    summary.push(`${status.agentCount} agents registered`);
  }

  return (
    <div className={`mb-4 px-3 py-2 rounded border flex items-center gap-3 text-xs sm:text-sm ${c.bg} ${c.border} ${c.text}`}>
      <div className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {UIDRAC_AGENT_NAME}: {STATUS_LABEL[state] ?? state}
          {summary.length > 0 && <span className="font-normal"> · {summary.join(' · ')}</span>}
        </p>
        {status.publicId && (
          <p className="font-mono text-[11px] text-text-secondary mt-0.5 truncate">
            <span className="font-sans font-semibold">Agent ID: </span>
            {status.publicId}
          </p>
        )}
      </div>
      {showManageLink && (
        <Link href="/agents" className={`${btnClass} border-dell-blue/40 text-dell-blue bg-white hover:bg-dell-blue/5`}>
          Manage agents
        </Link>
      )}
    </div>
  );
}
