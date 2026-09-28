'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppPageHeader from '@/components/layout/app-page-header';
import {
  useAgentsList,
  useAgentDownloadMeta,
  downloadAgentForId,
  registerNewAgent,
  statusBadgeClass,
  STATUS_LABEL,
  type AgentPlatform,
} from '@/lib/agents-client';
import { AgentPlatformIcon } from '@/components/agent/agent-platform-icon';
import { APP_VERSION_LABEL, CONZEX_CLOUD_PRODUCTION_URL, UIDRAC_AGENT_NAME } from '@idrac/shared';
import { Download, Loader2, Plus, RefreshCw, Copy, Check, ChevronRight } from 'lucide-react';
import { readStoredUser } from '@/lib/auth-client';

const PLATFORMS: { id: AgentPlatform; label: string }[] = [
  { id: 'win', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
  { id: 'darwin', label: 'macOS' },
];

export default function AgentsPage() {
  const { agents, loading, error, refresh } = useAgentsList();
  const meta = useAgentDownloadMeta();
  const role = readStoredUser()?.role;
  const canManage = role === 'ADMIN' || role === 'OWNER' || role === 'OPERATOR';

  const primary = agents.find((a) => a.isPrimary) ?? agents[0];
  const [platform, setPlatform] = useState<AgentPlatform>('win');
  const [arch, setArch] = useState('x64');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [checksum, setChecksum] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);

  useEffect(() => {
    if (primary && !selectedAgentId) setSelectedAgentId(primary.id);
  }, [primary, selectedAgentId]);

  const archOptions = useMemo(() => {
    const p = meta?.platforms.find((x) => x.id === platform);
    return p?.architectures ?? ['x64'];
  }, [meta, platform]);

  useEffect(() => {
    if (!archOptions.includes(arch)) setArch(archOptions[0] ?? 'x64');
  }, [archOptions, arch]);

  const installCommand = useMemo(() => {
    const cloud = meta?.productionCloudUrl ?? CONZEX_CLOUD_PRODUCTION_URL;
    if (platform === 'linux') {
      return `sudo bash install-linux.sh   # after unzipping your ${cloud} download`;
    }
    if (platform === 'win') {
      return `powershell -ExecutionPolicy Bypass -File .\\Install-UiDRAC-Agent.ps1`;
    }
    return `sudo installer -pkg UidracAgent.pkg -target / && sudo ./install.sh --config credentials.json`;
  }, [meta, platform]);

  const onDownload = async () => {
    if (!selectedAgentId) return;
    setDownloadBusy(true);
    setDownloadError('');
    setChecksum('');
    try {
      const { checksum: sum } = await downloadAgentForId(selectedAgentId, platform, arch);
      setChecksum(sum ?? '');
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadBusy(false);
    }
  };

  const onRegisterSite = async () => {
    setRegisterBusy(true);
    try {
      const row = await registerNewAgent(`Site agent ${agents.length + 1}`);
      setSelectedAgentId(row.id);
      refresh();
    } finally {
      setRegisterBusy(false);
    }
  };

  return (
    <>
      <AppPageHeader
        title="Agents"
        description={`Download and manage ${UIDRAC_AGENT_NAME} connectors for your organization.`}
        actions={
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-card rounded hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 bg-white border border-border-card rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">Download Agent</h2>
          <p className="text-sm text-text-secondary mb-4">
            Install the agent inside your network so Conzex cloud can reach iDRAC on your LAN. Each package is locked to
            your organization.
          </p>
          <p className="text-xs text-text-secondary mb-4">
            Production cloud:{' '}
            <code className="text-[11px]">{meta?.productionCloudUrl ?? CONZEX_CLOUD_PRODUCTION_URL}</code>
            <br />
            Latest version: <strong>{meta?.latestVersion ?? APP_VERSION_LABEL}</strong>
          </p>

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
            Agent identity
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full mb-3 px-3 py-2 text-sm border border-border-card rounded"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.publicId.slice(0, 8)}…)
              </option>
            ))}
          </select>
          {canManage && (
            <button
              type="button"
              disabled={registerBusy}
              onClick={onRegisterSite}
              className="mb-4 inline-flex items-center gap-1 text-xs text-dell-blue font-semibold"
            >
              {registerBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Register another site agent
            </button>
          )}

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
            Operating system
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as AgentPlatform)}
            className="w-full mb-3 px-3 py-2 text-sm border border-border-card rounded"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
            Architecture
          </label>
          <select
            value={arch}
            onChange={(e) => setArch(e.target.value)}
            className="w-full mb-3 px-3 py-2 text-sm border border-border-card rounded"
          >
            {archOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <p className="text-xs text-text-secondary mb-4 bg-bg-body border border-border-card rounded p-3">
            <strong>Requirements:</strong> {meta?.requirements?.[platform] ?? 'See documentation.'}
          </p>

          <button
            type="button"
            disabled={!canManage || downloadBusy || !selectedAgentId}
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue/90 disabled:opacity-50"
          >
            {downloadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download installer (.zip)
          </button>
          {downloadError && <p className="text-xs text-red-critical mt-2">{downloadError}</p>}
          {checksum && (
            <p className="text-[11px] text-text-secondary mt-2 font-mono break-all">
              SHA-256 (credentials.json): {checksum}
            </p>
          )}

          <div className="mt-4">
            <p className="text-xs font-semibold text-text-secondary mb-1">Installation command</p>
            <div className="flex gap-2">
              <code className="flex-1 text-[11px] bg-bg-body border border-border-card rounded p-2 break-all">
                {installCommand}
              </code>
              <button
                type="button"
                className="shrink-0 p-2 border border-border-card rounded"
                onClick={async () => {
                  await navigator.clipboard.writeText(installCommand);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 2000);
                }}
              >
                {copiedCmd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-3 bg-white border border-border-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-card bg-card-header flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Your agents</h2>
            <span className="text-xs text-text-secondary">{agents.length} registered</span>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-text-secondary">Loading…</p>
          ) : agents.length === 0 ? (
            <p className="p-6 text-sm text-text-secondary">No agents yet. Download and install your first agent.</p>
          ) : (
            <ul className="divide-y divide-border-card">
              {agents.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/agents/${a.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <AgentPlatformIcon
                      platform={a.os?.includes('win') ? 'win' : a.os?.includes('darwin') ? 'darwin' : 'linux'}
                      label=""
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{a.name}</p>
                      <p className="text-xs text-text-secondary font-mono truncate">{a.publicId}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadgeClass(a.status)}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
