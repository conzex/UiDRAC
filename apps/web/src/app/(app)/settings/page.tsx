/** Settings page */
'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AgentDownloadButton } from '@/components/agent/agent-download-button';
import { AgentStatusBanner } from '@/components/agent/agent-status-banner';
import { useAgentStatus, rotateAgentCredentials } from '@/lib/agent-client';
import AppPageHeader from '@/components/layout/app-page-header';
import { readStoredUser } from '@/lib/auth-client';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const { status: agentStatus, refresh } = useAgentStatus();
  const role = readStoredUser()?.role;
  useEffect(() => {
    setLoadError('');
    Promise.all([api.get('/tenant'), api.get('/tenant/users')])
      .then(([tenantRes, usersRes]) => {
        setTenant(tenantRes.data);
        setUsers(usersRes.data || []);
      })
      .catch(() => setLoadError('Could not load organization settings. Check your connection and try again.'));
  }, []);
  const [rotateBusy, setRotateBusy] = useState(false);
  const [rotateError, setRotateError] = useState('');
  const [rotatePlatform, setRotatePlatform] = useState<'linux' | 'darwin' | 'win'>('darwin');
  const rotate = async () => {
    if (!confirm('Rotate agent credentials? Existing installs must download the new ZIP bundle and restart.')) return;
    setRotateBusy(true);
    setRotateError('');
    try {
      await rotateAgentCredentials(rotatePlatform);
      refresh();
    } catch (err: unknown) {
      setRotateError(err instanceof Error ? err.message : 'Rotate failed');
    } finally {
      setRotateBusy(false);
    }
  };
  return (
    <>
      <AppPageHeader title="Settings" description="Your organization and UiDRAC site connector." />
      {loadError && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{loadError}</div>
      )}
      <AgentStatusBanner status={agentStatus} />
      <div className="space-y-4 mt-4">
        <div className="bg-white border border-border-card rounded p-6">
          <h2 className="font-semibold mb-3">{UIDRAC_AGENT_NAME}</h2>
          <p className="text-sm text-text-secondary mb-4 max-w-2xl">
            Install the {UIDRAC_AGENT_NAME} on Windows, Linux, or macOS inside your network so Conzex cloud can reach iDRAC on your LAN.
            Use <strong>Agent download</strong> below — each ZIP includes a tenant-locked <code className="text-[11px]">credentials.json</code> bound to your unique agent ID (not usable by other organizations).
          </p>
          {agentStatus && (
            <p className="text-xs text-text-secondary mb-4 max-w-2xl bg-dell-blue/5 border border-dell-blue/20 rounded p-3 font-mono">
              Organization: {agentStatus.tenantName} ({agentStatus.tenantSlug}) · Tenant ID: {agentStatus.tenantId}
              <br />
              Locked agent ID: {agentStatus.publicId}
              {agentStatus.credentialsRotatedAt && (
                <>
                  <br />
                  Credentials last rotated: {new Date(agentStatus.credentialsRotatedAt).toLocaleString()}
                </>
              )}
            </p>
          )}
          <p className="text-xs text-text-secondary mb-4 max-w-2xl bg-bg-body border border-border-card rounded p-3">
            <strong>Windows:</strong> download <strong>UidracAgentSetup.exe</strong> from{' '}
            <code className="text-[11px]">{agentStatus?.cloudUrl ?? 'your cloud URL'}/api/agent/download/setup</code>
            {' '}(Conzex EULA, copyright, service install). Also:{' '}
            <code className="text-[11px]">/api/agent/download/msi</code>. Then use your{' '}
            <code className="text-[11px]">uidrac-agent-win.json</code> from Agent download. Open{' '}
            <code className="text-[11px]">http://127.0.0.1:9742</code> for live logs and iDRAC activity.
          </p>
          <p className="text-xs text-text-secondary mb-4 max-w-2xl bg-bg-body border border-border-card rounded p-3">
            <strong>macOS:</strong> download <strong>UidracAgent.pkg</strong> from{' '}
            <code className="text-[11px]">{agentStatus?.cloudUrl ?? 'your cloud URL'}/api/agent/download/macos</code>
            , then run{' '}
            <code className="text-[11px]">sudo &quot;/Library/Application Support/Conzex/UiDRAC Agent/install.sh&quot; --config ~/Downloads/uidrac-agent-darwin.json</code>
            . Requires Node.js 20+ on the Mac. While running, open{' '}
            <code className="text-[11px]">http://127.0.0.1:9742</code> for Conzex logo, live logs, and iDRAC activity table.
          </p>
          <p className="text-xs text-text-secondary mb-4 max-w-2xl bg-bg-body border border-border-card rounded p-3">
            <strong>Rotate credentials</strong> invalidates the current agent secret and downloads a fresh macOS installer ZIP (use Agent download for other platforms). Re-install or replace <code className="text-[11px]">credentials.json</code> on every host running the agent, then restart the service or run <code className="text-[11px]">./scripts/start-local-agent.sh</code> for local dev.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <AgentDownloadButton variant="primary" />
            {(role === 'ADMIN' || role === 'OWNER') && (
              <>
                <select
                  value={rotatePlatform}
                  onChange={(e) => setRotatePlatform(e.target.value as 'linux' | 'darwin' | 'win')}
                  className="px-2 py-2 text-sm border border-border-card rounded bg-white"
                  aria-label="Platform for rotated installer ZIP"
                >
                  <option value="linux">Linux ZIP</option>
                  <option value="darwin">macOS ZIP</option>
                  <option value="win">Windows ZIP</option>
                </select>
                <button
                  type="button"
                  onClick={rotate}
                  disabled={rotateBusy}
                  className="px-3 py-2 text-sm border border-border-card rounded hover:bg-gray-50 disabled:opacity-60"
                >
                  {rotateBusy ? 'Rotating…' : 'Rotate credentials'}
                </button>
              </>
            )}
          </div>
          {rotateError && <p className="text-xs text-red-critical mt-2 max-w-2xl">{rotateError}</p>}
        </div>
        <div className="bg-white border border-border-card rounded p-6">
          <h2 className="font-semibold mb-3">Organization</h2>
          <p className="text-sm text-text-secondary">Name: {tenant?.name ?? (loadError ? '—' : 'Loading…')}</p>
          <p className="text-sm text-text-secondary">Plan: {tenant?.plan || '—'}</p>
        </div>
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Users</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-row-alt"><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Last Login</th></tr></thead>
            <tbody>{users.map((u) => <tr key={u.id} className="border-t border-border-card"><td className="p-3">{u.email}</td><td className="p-3 capitalize">{u.role?.toLowerCase()}</td><td className="p-3 text-text-secondary">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}