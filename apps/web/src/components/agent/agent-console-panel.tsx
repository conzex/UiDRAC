'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { STATUS_LABEL, statusBadgeClass, type AgentRow } from '@/lib/agents-client';
import { UIDRAC_AGENT_CONSOLE_TAGLINE, UIDRAC_AGENT_NAME } from '@idrac/shared';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

type ActivityRow = {
  at: string;
  event: string;
  ip: string;
  serviceTag?: string;
  model?: string;
  health?: string;
  result: string;
  detail?: string;
};

type ConsoleSnapshot = {
  version: string;
  cloudUrl: string;
  wsUrl: string;
  agentId: string;
  tenantId: string;
  tenantName: string;
  cloudConnected: boolean;
  authenticated: boolean;
  lastError: string | null;
  startedAt: string;
};

type ConsolePayload = {
  agent: AgentRow;
  snapshot: ConsoleSnapshot;
  activity: ActivityRow[];
};

type Props = {
  agentId: string;
  compact?: boolean;
  /** Full-page console: iDRAC activity grows to fill remaining viewport. */
  fullPage?: boolean;
};

function resultClass(result: string): string {
  if (result === 'ok') return 'text-green-healthy font-semibold';
  if (result === 'fail') return 'text-red-critical font-semibold';
  return 'text-amber-700 font-semibold';
}

export function AgentConsolePanel({ agentId, compact, fullPage }: Props) {
  const [data, setData] = useState<ConsolePayload | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api
      .get<ConsolePayload>(`/agents/${agentId}/console`)
      .then((r) => setData(r.data))
      .catch(() => setError('Unable to load agent console'));
  }, [agentId]);

  useEffect(() => {
    load();
    if (compact) return;
    const t = setInterval(load, 4_000);
    return () => clearInterval(t);
  }, [load, compact]);

  if (!data && !error) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-dell-blue" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const { agent, snapshot, activity } = data;
  const connected = snapshot.authenticated && snapshot.cloudConnected;
  const displayName = agent.isPrimary ? 'Master-Agent (Default)' : agent.name;

  return (
    <section
      className={`flex flex-col border border-border-card rounded bg-white overflow-hidden ${
        fullPage ? 'flex-1 min-h-0' : ''
      }`}
    >
      <div className="bg-card-header px-4 py-3 border-b border-border-card flex flex-wrap items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{UIDRAC_AGENT_NAME}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{UIDRAC_AGENT_CONSOLE_TAGLINE}</p>
          <p className="text-[11px] text-text-secondary mt-1">
            <span className="font-semibold text-text-primary">{displayName}</span>
            <span className="mx-1.5 text-border-card">·</span>
            <span className="font-mono">{snapshot.agentId}</span>
          </p>
        </div>
        <span
          className={`text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
            connected ? 'bg-green-100 text-green-800' : statusBadgeClass(agent.status)
          }`}
        >
          {connected ? 'Connected' : STATUS_LABEL[agent.status]}
        </span>
      </div>

      <div
        className={`p-4 flex flex-col gap-4 ${fullPage ? 'flex-1 min-h-0' : ''} ${compact ? '' : ''}`}
      >
        <div className="grid sm:grid-cols-2 gap-3 shrink-0">
          <div className="border border-border-card rounded p-3 bg-bg-body/30">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-2">Cloud connection</h3>
            <dl className="text-xs space-y-1.5">
              <div>
                <dt className="text-text-secondary">Cloud URL</dt>
                <dd className="font-mono text-[11px] break-all text-text-primary">{snapshot.cloudUrl}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">WebSocket</dt>
                <dd className="font-mono text-[11px] break-all text-text-primary">{snapshot.wsUrl}</dd>
              </div>
              {snapshot.lastError && (
                <div>
                  <dt className="text-text-secondary">Last error</dt>
                  <dd className="text-red-700">{snapshot.lastError}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="border border-border-card rounded p-3 bg-bg-body/30">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-2">Agent</h3>
            <dl className="text-xs space-y-1.5">
              <div>
                <dt className="text-text-secondary">Version</dt>
                <dd className="font-mono text-text-primary">{snapshot.version || '—'}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Tenant</dt>
                <dd className="text-text-primary">{snapshot.tenantName || snapshot.tenantId || '—'}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Locked agent ID</dt>
                <dd className="font-mono text-[11px] break-all text-text-primary">{snapshot.agentId}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Started</dt>
                <dd className="text-text-primary">
                  {snapshot.startedAt ? new Date(snapshot.startedAt).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {compact ? (
          <Link
            href={`/agents/${agentId}/console`}
            className="flex w-full items-center justify-center h-10 px-4 text-sm font-semibold rounded bg-dell-blue text-white hover:bg-dell-blue-hover transition-colors shrink-0"
          >
            UiDRAC Agent console
          </Link>
        ) : (
          <div
            className={`border border-border-card rounded overflow-hidden flex flex-col min-h-0 ${
              fullPage ? 'flex-1' : ''
            }`}
          >
            <div className="bg-row-alt px-3 py-2 border-b border-border-card shrink-0">
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-primary">iDRAC activity</h3>
            </div>
            <div className={`overflow-auto min-h-0 ${fullPage ? 'flex-1' : 'max-h-[28rem]'}`}>
              <table className="w-full text-xs">
                <thead className="bg-white text-left text-[10px] uppercase text-text-secondary border-b border-border-card sticky top-0 z-[1]">
                  <tr>
                    <th className="p-2 font-semibold">Time</th>
                    <th className="p-2 font-semibold">Event</th>
                    <th className="p-2 font-semibold">iDRAC IP</th>
                    <th className="p-2 font-semibold hidden sm:table-cell">Tag</th>
                    <th className="p-2 font-semibold hidden md:table-cell">Model</th>
                    <th className="p-2 font-semibold">Result</th>
                    <th className="p-2 font-semibold hidden lg:table-cell">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-text-secondary text-center">
                        No LAN activity yet for this agent.
                      </td>
                    </tr>
                  ) : (
                    activity.map((r, i) => (
                      <tr key={`${r.at}-${i}`} className={i % 2 === 1 ? 'bg-row-alt' : ''}>
                        <td className="p-2 whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                        <td className="p-2">{r.event}</td>
                        <td className="p-2 font-mono">{r.ip}</td>
                        <td className="p-2 hidden sm:table-cell">{r.serviceTag ?? '—'}</td>
                        <td className="p-2 hidden md:table-cell">{r.model ?? '—'}</td>
                        <td className={`p-2 ${resultClass(r.result)}`}>{r.result}</td>
                        <td className="p-2 hidden lg:table-cell text-text-secondary">{r.detail ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
