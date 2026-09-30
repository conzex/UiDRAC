'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { STATUS_LABEL, statusBadgeClass, displayAgentName } from '@/lib/agents-client';
import { resolveAgentHostIp, UIDRAC_AGENT_CONSOLE_TAGLINE, UIDRAC_AGENT_NAME } from '@idrac/shared';
import { ArrowLeft, RefreshCw } from 'lucide-react';

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
  localLanIp?: string | null;
};

type ConsoleAgent = import('@/lib/agents-client').AgentRow & { hostIp?: string | null };

type SummaryPayload = {
  agent: ConsoleAgent;
  snapshot: ConsoleSnapshot;
};

type Props = {
  agentId: string;
  fullPage?: boolean;
  onBack?: () => void;
};

const SUMMARY_POLL_MS = 12_000;
const ACTIVITY_POLL_MS = 6_000;

function resultClass(result: string): string {
  if (result === 'ok') return 'text-green-healthy font-semibold';
  if (result === 'fail') return 'text-red-critical font-semibold';
  return 'text-amber-700 font-semibold';
}

/** Agent console — header renders immediately; activity loads independently. */
export function AgentSitePanel({ agentId, fullPage, onBack }: Props) {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [summaryError, setSummaryError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [activityLoading, setActivityLoading] = useState(true);
  const summaryGen = useRef(0);
  const activityGen = useRef(0);

  const loadSummary = useCallback(() => {
    const gen = ++summaryGen.current;
    api
      .get<SummaryPayload>(`/agents/${agentId}/console/summary`, { timeout: 12_000 })
      .then((r) => {
        if (gen !== summaryGen.current) return;
        setSummary(r.data);
        setSummaryError('');
      })
      .catch((err: { response?: { data?: { message?: string }; status?: number }; message?: string }) => {
        if (gen !== summaryGen.current) return;
        const msg =
          err?.response?.data?.message ||
          (err?.response?.status === 503
            ? 'Agent API is temporarily busy. Status will refresh automatically.'
            : 'Could not refresh agent status. The console will keep retrying.');
        setSummaryError(msg);
      });
  }, [agentId]);

  const loadActivity = useCallback(() => {
    const gen = ++activityGen.current;
    setActivityLoading((prev) => (activity.length === 0 ? true : prev));
    api
      .get<{ activity: ActivityRow[] }>(`/agents/${agentId}/console/activity`, { timeout: 12_000 })
      .then((r) => {
        if (gen !== activityGen.current) return;
        setActivity(Array.isArray(r.data.activity) ? r.data.activity : []);
        setActivityError('');
      })
      .catch(() => {
        if (gen !== activityGen.current) return;
        setActivityError('Activity feed temporarily unavailable.');
      })
      .finally(() => {
        if (gen === activityGen.current) setActivityLoading(false);
      });
  }, [agentId, activity.length]);

  useEffect(() => {
    loadSummary();
    loadActivity();
    const t1 = setInterval(loadSummary, SUMMARY_POLL_MS);
    const t2 = setInterval(loadActivity, ACTIVITY_POLL_MS);
    return () => {
      summaryGen.current += 1;
      activityGen.current += 1;
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [loadSummary, loadActivity]);

  const agent = summary?.agent;
  const snapshot = summary?.snapshot;
  const displayName = agent ? displayAgentName(agent) : 'Master-Agent (Default)';
  const connected = Boolean(snapshot?.authenticated && snapshot?.cloudConnected);
  const statusLabel = connected ? 'Connected' : agent ? STATUS_LABEL[agent.status] : 'Loading…';
  const publicIp =
    agent?.hostIp ??
    (snapshot ? resolveAgentHostIp(snapshot.localLanIp, agent?.lastSeenIp ?? null) : null) ??
    '—';

  return (
    <section
      className={`flex flex-col border border-border-card rounded bg-white ${
        fullPage ? 'flex-1 min-h-0 overflow-hidden' : 'overflow-hidden'
      }`}
    >
      <div className="bg-card-header px-4 py-3 border-b border-border-card flex flex-wrap items-start justify-between gap-3 shrink-0">
        <div className="min-w-0 flex items-start gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 p-1.5 rounded border border-border-card bg-white hover:bg-row-hover shrink-0"
              title="Back to agents"
            >
              <ArrowLeft className="w-4 h-4 text-text-secondary" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text-primary">{displayName}</p>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary mt-1">{UIDRAC_AGENT_NAME}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{UIDRAC_AGENT_CONSOLE_TAGLINE}</p>
            <p className="text-[11px] text-text-secondary mt-2">
              <span className="font-semibold text-text-primary">{displayName}</span>
            </p>
            <p className="mt-2 text-[11px] text-text-secondary">
              Public IP: <span className="font-mono font-medium text-text-primary">{publicIp}</span>
            </p>
            <p className="text-[11px] text-text-secondary">
              Status:{' '}
              <span className={`font-semibold ${connected ? 'text-green-800' : 'text-text-primary'}`}>
                {statusLabel}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              loadSummary();
              loadActivity();
            }}
            className="text-[11px] px-2 py-1 rounded border border-border-card hover:bg-row-hover flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <span
            className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
              connected ? 'bg-green-100 text-green-800' : agent ? statusBadgeClass(agent.status) : 'bg-gray-100 text-gray-600'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className={`p-4 flex flex-col min-h-0 ${fullPage ? 'flex-1 overflow-hidden' : ''}`}>
        {summaryError && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3 shrink-0">
            {summaryError}
          </p>
        )}
        {snapshot?.lastError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 shrink-0">
            {snapshot.lastError}
          </p>
        )}

        <div
          className={`border border-border-card rounded flex flex-col min-h-0 overflow-hidden ${fullPage ? 'flex-1' : ''}`}
        >
          <div className="bg-row-alt px-3 py-2 border-b border-border-card shrink-0 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-primary">iDRAC activity</h3>
            {activityLoading && activity.length === 0 && (
              <span className="text-[10px] text-text-secondary">Loading…</span>
            )}
          </div>
          {activityError && (
            <p className="text-xs text-text-secondary px-3 py-2 border-b border-border-card">{activityError}</p>
          )}
          <div
            className={`min-h-0 overflow-y-auto overflow-x-auto ${
              fullPage ? 'flex-1 max-h-none' : 'max-h-[32rem]'
            }`}
          >
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
                {activity.length === 0 && !activityLoading ? (
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
      </div>
    </section>
  );
}
