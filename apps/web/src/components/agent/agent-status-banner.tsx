'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wifi, WifiOff, Copy, Check } from 'lucide-react';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import type { AgentStatus } from '@/lib/agent-client';
import { STATUS_LABEL, statusBadgeClass } from '@/lib/agents-client';

export function AgentStatusBanner({ status }: { status: AgentStatus | null }) {
  const [copied, setCopied] = useState(false);

  if (!status) return null;
  const state = status.status ?? (status.connected ? 'connected' : 'disconnected');
  const connected = state === 'connected';

  const copyId = async () => {
    await navigator.clipboard.writeText(status.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 text-sm px-4 py-3 rounded border ${
        connected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {connected ? <Wifi className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
        <span className="font-medium shrink-0">
          {UIDRAC_AGENT_NAME}: {STATUS_LABEL[state] ?? state}
          {status.requireEdgeAgent && !connected && ' — install from Agents → Download Agent'}
        </span>
        <Link href="/agents" className="text-xs font-semibold underline shrink-0">
          Manage
        </Link>
      </div>
      {status.lastConnectedAt && (
        <span className="text-xs opacity-80">
          Last seen {new Date(status.lastConnectedAt).toLocaleString()}
          {status.lastSeenIp ? ` from ${status.lastSeenIp}` : ''}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeClass(state)}`}>{STATUS_LABEL[state]}</span>
        <span className="text-xs font-mono break-all">
          {status.agentCount && status.agentCount > 1 ? `${status.agentCount} agents · ` : ''}
          ID: <span className="font-semibold">{status.publicId.slice(0, 8)}…</span>
        </span>
        <button
          type="button"
          onClick={copyId}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border border-current/20 hover:bg-black/5 shrink-0"
          title="Copy agent ID"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
