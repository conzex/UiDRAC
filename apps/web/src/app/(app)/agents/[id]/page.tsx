'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import AppPageHeader from '@/components/layout/app-page-header';
import { STATUS_LABEL, statusBadgeClass, downloadAgentForId, type AgentRow } from '@/lib/agents-client';
import { readStoredUser } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = readStoredUser()?.role;
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => {
    api
      .get<AgentRow>(`/agents/${id}`)
      .then((r) => setAgent(r.data))
      .catch(() => setError('Agent not found'));
  };

  useEffect(load, [id]);

  const act = async (action: 'disable' | 'revoke' | 'rotate') => {
    if (!agent) return;
    if (action === 'revoke' && !confirm('Revoke this agent? It will no longer authenticate to the cloud.')) return;
    setBusy(action);
    try {
      if (action === 'disable') await api.post(`/agents/${id}/disable`);
      if (action === 'revoke') await api.post(`/agents/${id}/revoke`);
      if (action === 'rotate') await api.post(`/agents/${id}/rotate`, null, { params: { platform: 'linux' }, responseType: 'blob' });
      load();
      if (action === 'revoke') router.push('/agents');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy('');
    }
  };

  if (!agent && !error) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-dell-blue" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || 'Not found'}</p>
        <Link href="/agents" className="text-dell-blue text-sm mt-2 inline-block">
          ← Back to agents
        </Link>
      </div>
    );
  }

  return (
    <>
      <AppPageHeader title={agent.name} description="Agent details and management" />
      <Link href="/agents" className="text-sm text-dell-blue mb-4 inline-block">
        ← All agents
      </Link>
      <div className="bg-white border border-border-card rounded-lg p-6 max-w-3xl space-y-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadgeClass(agent.status)}`}>
            {STATUS_LABEL[agent.status]}
          </span>
          {agent.agentVersion && (
            <span className="text-xs text-text-secondary">v{agent.agentVersion}</span>
          )}
        </div>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-text-secondary text-xs uppercase">Agent ID</dt>
            <dd className="font-mono break-all">{agent.publicId}</dd>
          </div>
          <div>
            <dt className="text-text-secondary text-xs uppercase">Hostname</dt>
            <dd>{agent.hostname ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-text-secondary text-xs uppercase">OS / Arch</dt>
            <dd>
              {agent.os ?? '—'} / {agent.arch ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary text-xs uppercase">Last connected</dt>
            <dd>{agent.lastConnectedAt ? new Date(agent.lastConnectedAt).toLocaleString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-text-secondary text-xs uppercase">Last heartbeat</dt>
            <dd>{agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toLocaleString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-text-secondary text-xs uppercase">Cloud</dt>
            <dd className="font-mono text-xs">{agent.cloudUrl}</dd>
          </div>
        </dl>
        {isAdmin && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border-card">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => act('disable')}
              className="px-3 py-2 text-sm border border-border-card rounded"
            >
              Disable
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => act('revoke')}
              className="px-3 py-2 text-sm border border-red-200 text-red-700 rounded"
            >
              Revoke & remove
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => downloadAgentForId(agent.id, 'linux', 'x64')}
              className="px-3 py-2 text-sm bg-dell-blue text-white rounded"
            >
              Download Linux package
            </button>
          </div>
        )}
      </div>
    </>
  );
}
