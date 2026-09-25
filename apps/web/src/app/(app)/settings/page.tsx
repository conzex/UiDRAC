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
  const rotate = async () => {
    if (!confirm('Rotate agent credentials? Existing installs must download the new bundle.')) return;
    await rotateAgentCredentials();
    refresh();
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
          </p>
          <p className="text-xs text-text-secondary mb-4 max-w-2xl bg-bg-body border border-border-card rounded p-3">
            <strong>Rotate credentials</strong> invalidates the current agent secret and issues a new download bundle. Use this if an agent config was leaked or an employee left; every installed agent must be re-downloaded and restarted afterward.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <AgentDownloadButton variant="primary" />
            {(role === 'ADMIN' || role === 'OWNER') && (
              <button type="button" onClick={rotate} className="px-3 py-2 text-sm border border-border-card rounded hover:bg-gray-50">
                Rotate credentials
              </button>
            )}
          </div>
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