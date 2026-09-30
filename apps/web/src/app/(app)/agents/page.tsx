'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useAgentsList,
  useAgentDownloadMeta,
  downloadAgentForId,
  registerNewAgent,
  statusBadgeClass,
  STATUS_LABEL,
  type AgentPlatform,
} from '@/lib/agents-client';
import { detectClientArch, detectClientPlatform } from '@/lib/client-platform';
import { AgentPlatformPicker } from '@/components/agent/agent-platform-picker';
import { AgentManageModal } from '@/components/agent/agent-manage-modal';
import ConfirmModal from '@/components/ui/confirm-modal';
import AppModal from '@/components/ui/app-modal';
import AppPageHeader from '@/components/layout/app-page-header';
import AppPreloader from '@/components/layout/app-preloader';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import { Download, Loader2, Plus, RefreshCw, Trash2, Ban, RotateCcw, ExternalLink } from 'lucide-react';
import { readStoredUser } from '@/lib/auth-client';
import api from '@/lib/api';

function cardHeader(title: string) {
  return (
    <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{title}</h2>
    </div>
  );
}

function AgentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { agents, loading, error, refresh, lastRefreshAt } = useAgentsList(5_000);
  const meta = useAgentDownloadMeta();
  const role = readStoredUser()?.role;
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  const canManage = isAdmin || role === 'OPERATOR';

  const [platform, setPlatform] = useState<AgentPlatform>('linux');
  const [arch, setArch] = useState('x64');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [manageAgentId, setManageAgentId] = useState<string | null>(null);

  // Add agent modal
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'revoke' | 'delete' | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const manageAgent = agents.find((a) => a.id === manageAgentId);
  const connectedCount = agents.filter((a) => a.status === 'connected').length;
  const revokedCount = agents.filter((a) => a.status === 'revoked').length;

  useEffect(() => {
    const p = detectClientPlatform();
    setPlatform(p);
    setArch(detectClientArch(p));
  }, []);

  useEffect(() => {
    const active = agents.filter((a) => a.status !== 'revoked');
    const pick = active.find((a) => a.isPrimary) ?? active[0] ?? agents[0];
    if (pick && !selectedAgentId) setSelectedAgentId(pick.id);
  }, [agents, selectedAgentId]);

  useEffect(() => {
    const fromUrl = searchParams.get('manage');
    if (fromUrl && agents.some((a) => a.id === fromUrl)) {
      setManageAgentId(fromUrl);
    }
  }, [searchParams, agents]);

  const openManage = (id: string) => {
    setManageAgentId(id);
    router.replace(`/agents?manage=${id}`, { scroll: false });
  };

  const closeManage = () => {
    setManageAgentId(null);
    router.replace('/agents', { scroll: false });
  };

  const archOptions = useMemo(() => {
    return meta?.platforms.find((x) => x.id === platform)?.architectures ?? ['x64'];
  }, [meta, platform]);

  const onDownload = async () => {
    if (!selectedAgentId || selectedAgent?.status === 'revoked') {
      setDownloadError('Select an active agent or open a revoked row to reactivate.');
      return;
    }
    setDownloadBusy(true);
    setDownloadError('');
    try {
      await downloadAgentForId(selectedAgentId, platform, arch);
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadBusy(false);
    }
  };

  const onRegister = async () => {
    setRegisterBusy(true);
    try {
      const name = newAgentName.trim() || `Site ${agents.length + 1}`;
      const row = await registerNewAgent(name);
      setSelectedAgentId(row.id);
      setNewAgentName('');
      setShowAddAgent(false);
      refresh();
    } finally {
      setRegisterBusy(false);
    }
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === agents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(agents.map((a) => a.id)));
    }
  };

  const doBulkAction = async () => {
    if (!bulkConfirmAction || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      for (const id of selectedIds) {
        if (bulkConfirmAction === 'revoke') {
          const agent = agents.find((a) => a.id === id);
          if (agent && agent.status !== 'revoked') {
            await api.post(`/agents/${id}/revoke`);
          }
        } else if (bulkConfirmAction === 'delete') {
          const agent = agents.find((a) => a.id === id);
          if (agent && agent.status === 'revoked' && !agent.isPrimary) {
            await api.delete(`/agents/${id}`);
          }
        }
      }
      setSelectedIds(new Set());
      refresh();
    } finally {
      setBulkBusy(false);
      setBulkConfirmAction(null);
    }
  };

  const bulkSyncAll = () => {
    refresh();
    setSelectedIds(new Set());
  };

  const bulkRevokeCount = [...selectedIds].filter((id) => {
    const a = agents.find((x) => x.id === id);
    return a && a.status !== 'revoked';
  }).length;

  const bulkDeleteCount = [...selectedIds].filter((id) => {
    const a = agents.find((x) => x.id === id);
    return a && a.status === 'revoked' && !a.isPrimary;
  }).length;

  // Count unique hostnames across all agents
  const hostCount = new Set(agents.map((a) => a.hostname).filter(Boolean)).size;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <AppPageHeader
        title="Agents"
        description={`${UIDRAC_AGENT_NAME} site connectors`}
        className="mb-4 shrink-0"
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => { setShowAddAgent(true); setNewAgentName(''); }}
                className="h-9 px-4 text-sm font-semibold rounded border border-dell-blue text-dell-blue hover:bg-dell-blue hover:text-white inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add agent
              </button>
            )}
            <button
              type="button"
              onClick={() => { refresh(); setSelectedIds(new Set()); }}
              className="h-9 px-4 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="shrink-0 mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 shrink-0">
        {[
          { label: 'Registered', value: agents.length, color: 'text-dell-blue' },
          { label: 'Connected', value: connectedCount, color: 'text-green-healthy' },
          { label: 'Revoked', value: revokedCount, color: 'text-red-critical' },
          {
            label: 'Last sync',
            value: lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : '—',
            color: 'text-text-primary text-lg sm:text-2xl',
            small: true,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded border border-border-card">
            <div className={`font-bold ${s.small ? 'text-sm sm:text-base' : 'text-3xl'} ${s.color}`}>{s.value}</div>
            <div className="text-sm text-text-secondary mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Sidebar — download installer */}
        <aside className="lg:col-span-4 flex flex-col min-h-0 gap-3">
          <section className="bg-white border border-border-card rounded flex flex-col min-h-0 overflow-hidden">
            {cardHeader('Download installer')}
            <div className="p-4 space-y-2 overflow-y-auto min-h-0">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-card rounded bg-white"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.status === 'revoked'}>
                    {a.isPrimary ? 'Master-Agent (Default)' : a.name}
                  </option>
                ))}
              </select>
              {selectedAgent && (
                <p className="text-[10px] text-text-secondary break-all line-clamp-2">
                  <span className="font-semibold">Agent ID: </span>
                  <span className="font-mono">{selectedAgent.publicId}</span>
                </p>
              )}
              <AgentPlatformPicker value={platform} onChange={setPlatform} />
              <select
                value={arch}
                onChange={(e) => setArch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-card rounded bg-white"
              >
                {archOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!canManage || downloadBusy}
                onClick={onDownload}
                className="w-full py-2 flex items-center justify-center gap-2 bg-dell-blue text-white text-sm font-semibold rounded disabled:opacity-50"
              >
                {downloadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download ZIP
              </button>
              {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}
            </div>
          </section>
        </aside>

        {/* Agent table */}
        <section className="lg:col-span-8 bg-white border border-border-card rounded flex flex-col min-h-0 overflow-hidden">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">
              Registered agents
            </h2>
            {selectedIds.size > 0 && isAdmin && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary mr-1">{selectedIds.size} selected</span>
                <button type="button" onClick={bulkSyncAll} title="Sync" className="p-1.5 rounded hover:bg-gray-200 text-dell-blue">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                {bulkRevokeCount > 0 && (
                  <button type="button" onClick={() => setBulkConfirmAction('revoke')} title={`Revoke ${bulkRevokeCount}`} className="p-1.5 rounded hover:bg-red-50 text-red-critical">
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
                {bulkDeleteCount > 0 && (
                  <button type="button" onClick={() => setBulkConfirmAction('delete')} title={`Delete ${bulkDeleteCount}`} className="p-1.5 rounded hover:bg-red-50 text-red-critical">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          {loading && agents.length === 0 ? (
            <p className="p-6 text-sm text-text-secondary">Loading…</p>
          ) : agents.length === 0 ? (
            <p className="p-6 text-sm text-text-secondary">No agents yet. Click &quot;Add agent&quot; and download an installer ZIP.</p>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-row-alt text-left text-[11px] uppercase text-text-secondary sticky top-0 z-10 border-b border-border-card">
                  <tr>
                    {isAdmin && (
                      <th className="p-3 w-8">
                        <input type="checkbox" checked={selectedIds.size === agents.length && agents.length > 0} onChange={toggleSelectAll} className="accent-dell-blue" />
                      </th>
                    )}
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Hosts ({hostCount})</th>
                    <th className="p-3 font-semibold hidden sm:table-cell">Heartbeat</th>
                    <th className="p-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, i) => (
                    <tr
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openManage(a.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openManage(a.id); } }}
                      className={`border-t border-border-card cursor-pointer hover:bg-row-hover focus:bg-row-hover focus:outline-none ${
                        i % 2 === 1 ? 'bg-row-alt' : ''
                      } ${manageAgentId === a.id ? 'ring-1 ring-inset ring-dell-blue/30' : ''} ${
                        selectedIds.has(a.id) ? 'bg-dell-blue/5' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="p-3 w-8" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="accent-dell-blue" />
                        </td>
                      )}
                      <td className="p-3 font-medium">
                        {a.isPrimary ? (
                          <>Master-Agent <span className="text-[10px] font-semibold text-dell-blue bg-row-hover px-1.5 py-0.5 rounded">(Default)</span></>
                        ) : (
                          a.name
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusBadgeClass(a.status)}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                      <td className="p-3 text-text-secondary text-xs hidden md:table-cell">{a.hostname ?? '—'}</td>
                      <td className="p-3 text-[11px] text-text-secondary hidden sm:table-cell">
                        {a.lastHeartbeatAt
                          ? new Date(a.lastHeartbeatAt).toLocaleTimeString()
                          : a.lastConnectedAt
                            ? new Date(a.lastConnectedAt).toLocaleTimeString()
                            : '—'}
                      </td>
                      <td className="p-3 w-10 text-center">
                        <ExternalLink className="w-3.5 h-3.5 text-text-secondary inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Add agent lightbox modal */}
      <AppModal
        open={showAddAgent}
        onClose={() => setShowAddAgent(false)}
        title="Register new agent / site"
        subtitle="Add a new site connector to your organization"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Site name</label>
            <input
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              placeholder={`e.g. DC-East-${agents.length + 1}`}
              className="w-full px-3 py-2 text-sm border border-border-card rounded"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && !registerBusy) onRegister(); }}
            />
            <p className="text-[11px] text-text-secondary">Leave blank to auto-generate a name.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddAgent(false)}
              className="h-9 px-4 text-sm font-semibold border border-border-card rounded bg-white hover:bg-row-hover text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={registerBusy}
              onClick={onRegister}
              className="h-9 px-4 text-sm font-semibold bg-dell-blue text-white rounded hover:bg-dell-blue-hover inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {registerBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Register agent
            </button>
          </div>
        </div>
      </AppModal>

      <AgentManageModal
        agentId={manageAgentId}
        agentName={manageAgent ? (manageAgent.isPrimary ? 'Master-Agent (Default)' : manageAgent.name) : undefined}
        onClose={closeManage}
        onChanged={refresh}
      />

      <ConfirmModal
        open={bulkConfirmAction === 'revoke'}
        title={`Revoke ${bulkRevokeCount} agent(s)?`}
        message="Cloud will reject credentials for all selected agents immediately. You will need to reactivate each one individually."
        confirmLabel={bulkBusy ? 'Revoking…' : `Revoke ${bulkRevokeCount} agent(s)`}
        variant="danger"
        onConfirm={doBulkAction}
        onCancel={() => setBulkConfirmAction(null)}
      />

      <ConfirmModal
        open={bulkConfirmAction === 'delete'}
        title={`Delete ${bulkDeleteCount} revoked agent(s)?`}
        message="Selected revoked agents will be permanently removed. This cannot be undone. Default master agents are excluded."
        confirmLabel={bulkBusy ? 'Deleting…' : `Delete ${bulkDeleteCount} agent(s)`}
        variant="danger"
        onConfirm={doBulkAction}
        onCancel={() => setBulkConfirmAction(null)}
      />
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<AppPreloader label="Loading agents…" fullScreen={false} />}>
      <AgentsPageContent />
    </Suspense>
  );
}
