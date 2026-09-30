/** Settings — organization profile and team (agents live on /agents). */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAgentStatus } from '@/lib/agent-client';
import { STATUS_LABEL } from '@/lib/agents-client';
import AppPageHeader from '@/components/layout/app-page-header';
import { CLOUD_SAAS_PRODUCT, PRODUCT_NAME, UIDRAC_AGENT_NAME } from '@idrac/shared';

export default function SettingsPage() {
  const [tenant, setTenant] = useState<{ name?: string; plan?: string; slug?: string } | null>(null);
  const [users, setUsers] = useState<
    { id: string; email: string; role: string; lastLoginAt: string | null }[]
  >([]);
  const [loadError, setLoadError] = useState('');
  const { status: agentStatus } = useAgentStatus();

  const agentState = agentStatus?.status ?? (agentStatus?.connected ? 'connected' : 'offline');
  const agentStateLabel = agentStatus ? (STATUS_LABEL[agentState] ?? agentState) : '—';

  useEffect(() => {
    setLoadError('');
    Promise.all([api.get('/tenant'), api.get('/tenant/users')])
      .then(([tenantRes, usersRes]) => {
        setTenant(tenantRes.data);
        setUsers(usersRes.data || []);
      })
      .catch(() => setLoadError('Could not load organization settings. Check your connection and try again.'));
  }, []);

  return (
    <>
      <AppPageHeader
        title="Settings"
        description={
          CLOUD_SAAS_PRODUCT
            ? 'Organization profile, team access, and UiDRAC agent connectors.'
            : `${PRODUCT_NAME} — organization profile, team roles, and LAN API deployment settings. Installers and ${UIDRAC_AGENT_NAME} connectors are managed on Agents.`
        }
      />

      {loadError && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{loadError}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Organization</h2>
          </div>
          <dl className="p-4 text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Name</dt>
              <dd className="font-medium text-text-primary">{tenant?.name ?? (loadError ? '—' : 'Loading…')}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Plan</dt>
              <dd className="capitalize">{tenant?.plan || '—'}</dd>
            </div>
            {tenant?.slug && (
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Slug</dt>
                <dd className="font-mono text-xs">{tenant.slug}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white border border-border-card rounded flex flex-col">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{UIDRAC_AGENT_NAME}</h2>
            <Link href="/agents" className="text-xs font-semibold text-dell-blue hover:underline shrink-0">
              Open Agents →
            </Link>
          </div>
          <div className="p-4 text-sm space-y-2">
            <p className="text-text-secondary leading-relaxed">
              Installers, credentials, and site agents are managed on the{' '}
              <Link href="/agents" className="text-dell-blue font-semibold hover:underline">
                Agents
              </Link>{' '}
              page.
            </p>
            <p className="text-xs text-text-secondary">
              Fleet status:{' '}
              <span className="font-semibold text-text-primary">{agentStateLabel}</span>
              {agentStatus?.agentCount != null && agentStatus.agentCount > 0 && (
                <> · {agentStatus.agentCount} registered</>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt border-b border-border-card">
                <th className="text-left p-3 font-semibold">Email</th>
                <th className="text-left p-3 font-semibold">Role</th>
                <th className="text-left p-3 font-semibold">Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role?.toLowerCase()}</td>
                  <td className="p-3 text-text-secondary">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !loadError && (
            <p className="p-6 text-sm text-text-secondary text-center">No users loaded.</p>
          )}
        </div>
      </div>
    </>
  );
}
