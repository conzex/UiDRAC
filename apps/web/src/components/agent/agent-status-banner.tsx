'use client';

import { Wifi, WifiOff } from 'lucide-react';
import type { AgentStatus } from '@/lib/agent-client';

export function AgentStatusBanner({ status }: { status: AgentStatus | null }) {
  if (!status) return null;
  const connected = status.connected;
  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-3 text-sm px-4 py-3 rounded border ${
        connected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      {connected ? <Wifi className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
      <span className="font-medium">
        Edge agent: {connected ? 'Connected' : 'Not connected'}
        {status.requireEdgeAgent && !connected && ' — required before adding servers'}
      </span>
      {status.lastConnectedAt && (
        <span className="text-xs opacity-80">
          Last seen {new Date(status.lastConnectedAt).toLocaleString()}
          {status.lastSeenIp ? ` from ${status.lastSeenIp}` : ''}
        </span>
      )}
      <span className="text-xs opacity-70 ml-auto font-mono">ID {status.publicId.slice(0, 8)}…</span>
    </div>
  );
}
