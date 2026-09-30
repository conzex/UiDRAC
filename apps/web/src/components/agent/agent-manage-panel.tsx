'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  STATUS_LABEL,
  statusBadgeClass,
  downloadAgentForId,
  type AgentRow,
  type AgentPlatform,
} from '@/lib/agents-client';
import { readStoredUser } from '@/lib/auth-client';
import { AgentIdCopy } from '@/components/agent/agent-id-copy';
import { AgentPlatformPicker } from '@/components/agent/agent-platform-picker';
import { getAgentInstallGuide } from '@/lib/client-platform';
import { detectClientPlatform } from '@/lib/client-platform';
import ConfirmModal from '@/components/ui/confirm-modal';
import { AgentConsolePanel } from '@/components/agent/agent-console-panel';
import { Loader2, RefreshCw } from 'lucide-react';

type Props = {
  agentId: string;
  onChanged?: () => void;
  onDeleted?: () => void;
};

export function AgentManagePanel({ agentId, onChanged, onDeleted }: Props) {
  const role = readStoredUser()?.role;
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  const canOperate = isAdmin || role === 'OPERATOR';
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [nameEdit, setNameEdit] = useState('');
  const [platform, setPlatform] = useState<AgentPlatform>(() =>
    typeof window !== 'undefined' ? detectClientPlatform() : 'darwin',
  );
  const [confirmAction, setConfirmAction] = useState<'revoke' | 'delete' | null>(null);

  const load = useCallback(() => {
    setError('');
    api
      .get<AgentRow>(`/agents/${agentId}`)
      .then((r) => {
        setAgent(r.data);
        setNameEdit(r.data.name);
      })
      .catch(() => setError('Agent not found'));
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  const revoked = agent?.status === 'revoked';
  const disabled = agent?.status === 'disabled';
  const guide = getAgentInstallGuide(platform);

  const act = async (
    action: 'disable' | 'enable' | 'revoke' | 'delete' | 'reactivate' | 'rename' | 'download',
  ) => {
    if (!agent) return;
    if (action === 'revoke' || action === 'delete') {
      setConfirmAction(action);
      return;
    }
    await doAction(action);
  };

  const doAction = async (action: string) => {
    if (!agent) return;
    setBusy(action);
    try {
      if (action === 'disable') await api.post(`/agents/${agentId}/disable`);
      if (action === 'enable') await api.post(`/agents/${agentId}/enable`);
      if (action === 'revoke') await api.post(`/agents/${agentId}/revoke`);
      if (action === 'reactivate') await api.post(`/agents/${agentId}/reactivate`);
      if (action === 'delete') {
        await api.delete(`/agents/${agentId}`);
        onDeleted?.();
        onChanged?.();
        return;
      }
      if (action === 'rename') {
        await api.patch(`/agents/${agentId}`, { name: nameEdit.trim() || 'Site agent' });
      }
      if (action === 'download') {
        await downloadAgentForId(agent.id, platform, 'x64');
      }
      load();
      onChanged?.();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || (e instanceof Error ? e.message : 'Action failed'));
    } finally {
      setBusy('');
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      doAction(confirmAction);
      setConfirmAction(null);
    }
  };

  const reactivateAndDownload = async () => {
    setBusy('reactivate');
    setError('');
    try {
      await api.post(`/agents/${agentId}/reactivate`);
      await downloadAgentForId(agentId, platform, 'x64');
      load();
      onChanged?.();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Reactivate failed');
    } finally {
      setBusy('');
    }
  };

  if (!agent && !error) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-dell-blue" />
      </div>
    );
  }

  if (!agent) {
    return <p className="text-sm text-red-600">{error || 'Not found'}</p>;
  }

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-5">
        <div className="space-y-3 min-w-0">
          {error && (
            <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
          )}
          {revoked && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Revoked — reactivate and download a new ZIP, then reinstall on the host.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadgeClass(agent.status)}`}>
              {STATUS_LABEL[agent.status]}
            </span>
            {agent.agentVersion && <span className="text-xs text-text-secondary">v{agent.agentVersion}</span>}
            <button
              type="button"
              onClick={load}
              className="ml-auto inline-flex items-center gap-1 text-xs text-dell-blue font-semibold"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          {canOperate && (
            <div className="flex gap-2">
              <input
                value={nameEdit}
                onChange={(e) => setNameEdit(e.target.value)}
                disabled={agent.isPrimary}
                className="flex-1 px-3 py-1.5 text-sm border border-border-card rounded disabled:bg-row-alt disabled:text-text-secondary"
              />
              <button
                type="button"
                disabled={!!busy || nameEdit.trim() === agent.name || agent.isPrimary}
                onClick={() => act('rename')}
                className="px-3 py-1.5 text-sm border border-border-card rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
          {agent.isPrimary && (
            <p className="text-[10px] text-text-secondary">Default master agent — name cannot be changed</p>
          )}
          <AgentIdCopy agentId={agent.publicId} />
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt className="text-[10px] text-text-secondary uppercase tracking-wide">Hostname</dt>
              <dd className="text-sm">{agent.hostname ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-text-secondary uppercase tracking-wide">OS / Arch</dt>
              <dd className="text-sm">
                {agent.os ?? '—'} / {agent.arch ?? '—'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] text-text-secondary uppercase tracking-wide">Last heartbeat</dt>
              <dd className="text-sm">
                {agent.lastHeartbeatAt
                  ? new Date(agent.lastHeartbeatAt).toLocaleString()
                  : agent.lastConnectedAt
                    ? new Date(agent.lastConnectedAt).toLocaleString()
                    : '—'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] text-text-secondary uppercase tracking-wide">Cloud</dt>
              <dd className="font-mono text-[11px] break-all">{agent.cloudUrl}</dd>
            </div>
          </dl>
        </div>

        {canOperate && (
          <div className="border border-border-card rounded bg-bg-body/40 p-3 space-y-3 min-w-0">
            <AgentPlatformPicker value={platform} onChange={setPlatform} />
            <div className="flex flex-wrap gap-2">
              {revoked && isAdmin && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={reactivateAndDownload}
                  className="px-3 py-1.5 text-sm bg-dell-blue text-white rounded font-semibold"
                >
                  {busy === 'reactivate' ? 'Working…' : 'Reactivate & download'}
                </button>
              )}
              {!revoked && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act('download')}
                  className="px-3 py-1.5 text-sm bg-dell-blue text-white rounded font-semibold"
                >
                  Download ZIP
                </button>
              )}
              {!revoked && disabled && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act('enable')}
                  className="px-3 py-1.5 text-sm border border-border-card rounded bg-white"
                >
                  Enable
                </button>
              )}
              {!revoked && !disabled && isAdmin && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act('disable')}
                  className="px-3 py-1.5 text-sm border border-border-card rounded bg-white"
                >
                  Pause
                </button>
              )}
              {!revoked && isAdmin && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act('revoke')}
                  className="px-3 py-1.5 text-sm border border-red-200 text-red-700 rounded bg-white"
                >
                  Revoke
                </button>
              )}
              {revoked && isAdmin && !agent.isPrimary && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => act('delete')}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-800 rounded bg-white"
                >
                  Remove
                </button>
              )}
              {revoked && agent.isPrimary && (
                <span className="text-[11px] text-text-secondary px-2 py-1.5">Default agent cannot be removed</span>
              )}
            </div>
            <details className="text-xs border border-border-card rounded bg-white">
              <summary className="px-3 py-2 cursor-pointer font-semibold text-text-primary select-none">
                Install steps ({guide.headline})
              </summary>
              <div className="px-3 pb-3 border-t border-border-card pt-2 space-y-2">
                <ol className="list-decimal list-inside text-text-secondary space-y-0.5">
                  {guide.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <pre className="text-[10px] font-mono bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                  {guide.commands.join('\n')}
                </pre>
                {guide.note && <p className="text-[11px] text-text-secondary">{guide.note}</p>}
              </div>
            </details>
            <p className="text-[11px] text-text-secondary">
              Install steps are in the expandable section above. Download additional platforms from this page sidebar.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-border-card">
        <AgentConsolePanel agentId={agentId} compact />
      </div>

      <ConfirmModal
        open={confirmAction === 'revoke'}
        title="Revoke this agent?"
        message="Cloud will reject current credentials immediately. You will need to reactivate and reinstall on the host to restore connectivity."
        confirmLabel="Revoke agent"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmModal
        open={confirmAction === 'delete'}
        title="Permanently remove this agent?"
        message="This revoked agent will be deleted from your list. This action cannot be undone."
        confirmLabel="Remove permanently"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
