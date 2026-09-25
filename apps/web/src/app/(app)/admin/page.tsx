/** Admin Panel — Super admin dashboard for cross-tenant management. */
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Building2, Server, Activity, Trash2, Search, RefreshCw,
  ChevronDown, ChevronRight, Eye, Clock, AlertTriangle, FileText, KeyRound,
} from 'lucide-react';
import api from '@/lib/api';
import AppPageHeader from '@/components/layout/app-page-header';
import { PRIMARY_PLATFORM_ADMIN_EMAIL } from '@idrac/shared';

interface Tenant { id: string; name: string; slug: string; plan: string; createdAt: string; _count?: { users: number; servers: number } }
interface UserRow { id: string; email: string; role: string; tenantId: string; createdAt: string; lastLoginAt: string | null; tenant?: { name: string } }
interface ServerRow { id: string; name: string; ip: string; generation: string; health: string; tenantId: string; createdAt: string; tenant?: { name: string } }
interface SessionRow { id: string; userId: string; ip: string; userAgent: string; expiresAt: string; createdAt: string; user?: { email: string } }
interface AuditRow { id: string; action: string; createdAt: string; tenantId: string; user?: { email: string }; tenant?: { name: string } }
interface ServerInvRow { id: string; tenantId: string; generation: string; health: string; createdAt: string; tenant?: { name: string } }

type Tab = 'overview' | 'tenants' | 'users' | 'servers' | 'sessions' | 'audit';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [serverInv, setServerInv] = useState<ServerInvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, uRes, sRes, sessRes] = await Promise.all([
        api.get('/tenant').catch(() => ({ data: [] })),
        api.get('/tenant/users').catch(() => ({ data: [] })),
        api.get('/servers').catch(() => ({ data: [] })),
        api.get('/auth/sessions').catch(() => ({ data: [] })),
      ]);
      const tData = Array.isArray(tRes.data) ? tRes.data : [tRes.data].filter(Boolean);
      const superAdmin = tData.length > 1 || tData.some((t: Tenant) => t.slug === 'system');
      setIsSuperAdmin(superAdmin);
      setTenants(tData);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      if (superAdmin) {
        try {
          const [aUsers, aSrv, aAudit, aTen] = await Promise.all([
            api.get('/admin/users'),
            api.get('/admin/servers'),
            api.get('/admin/audit'),
            api.get('/admin/tenants'),
          ]);
          setUsers(aUsers.data || []);
          setServerInv(aSrv.data || []);
          setAuditLogs(aAudit.data || []);
          setTenants(aTen.data || tData);
          setServers([]);
        } catch {
          setServers(Array.isArray(sRes.data) ? sRes.data : []);
        }
      } else {
        setServers(Array.isArray(sRes.data?.data) ? sRes.data.data : Array.isArray(sRes.data) ? sRes.data : []);
        setServerInv([]);
        setAuditLogs([]);
      }
      setSessions(Array.isArray(sessRes.data) ? sessRes.data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all associated sessions?')) return;
    try {
      if (isSuperAdmin) await api.delete(`/admin/users/${userId}`);
      else await api.delete(`/tenant/users/${userId}`);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const resetUserPassword = async (userId: string) => {
    if (!confirm('Generate a new temporary password for this user?')) return;
    try {
      const res = isSuperAdmin
        ? await api.post(`/admin/users/${userId}/reset-password`)
        : await api.post(`/tenant/users/${userId}/reset-password`);
      alert(res.data.message || 'Password reset email sent to the address on file for this account.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Reset failed');
    }
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('Delete this organization and ALL its data (users, servers, logs)?')) return;
    try {
      await api.delete(`/admin/tenants/${tenantId}`);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const deleteServerRecord = async (serverId: string) => {
    if (!confirm('Delete this server record?')) return;
    try {
      if (isSuperAdmin) await api.delete(`/admin/servers/${serverId}`);
      else await api.delete(`/servers/${serverId}`);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const deleteAuditRow = async (id: string) => {
    if (!confirm('Delete this audit log entry?')) return;
    try {
      await api.delete(`/admin/audit/${id}`);
      setAuditLogs((rows) => rows.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((s) => s.filter((ss) => ss.id !== sessionId));
    } catch { /* ignore */ }
  };

  const healthColor = (h: string) => {
    if (h === 'HEALTHY') return 'bg-green-healthy';
    if (h === 'WARNING') return 'bg-amber-warning';
    if (h === 'CRITICAL') return 'bg-red-critical';
    return 'bg-gray-400';
  };

  const roleColor = (r: string) => {
    if (r === 'OWNER') return 'bg-dell-blue text-white';
    if (r === 'ADMIN') return 'bg-amber-100 text-amber-800';
    if (r === 'OPERATOR') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  const isPrimaryPlatformAdmin = (u: UserRow) => u.email === PRIMARY_PLATFORM_ADMIN_EMAIL;

  const filteredUsers = search ? users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.tenant?.name?.toLowerCase().includes(search.toLowerCase())) : users;
  const filteredServers = search ? servers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.ip.includes(search) || s.tenant?.name?.toLowerCase().includes(search.toLowerCase())) : servers;

  const tabs: { id: Tab; label: string; Icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', Icon: Activity },
    { id: 'tenants', label: 'Organizations', Icon: Building2, count: tenants.length },
    { id: 'users', label: 'All Users', Icon: Users, count: users.length },
    { id: 'servers', label: 'All Servers', Icon: Server, count: servers.length },
    { id: 'sessions', label: 'Active Sessions', Icon: Clock, count: sessions.length },
    ...(isSuperAdmin ? [{ id: 'audit' as Tab, label: 'Audit Logs', Icon: FileText, count: auditLogs.length }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-dell-blue" />
      </div>
    );
  }

  return (
    <>
      <AppPageHeader
        title="Admin panel"
        description={isSuperAdmin ? 'Super admin — cross-tenant management' : 'Organization administration'}
        actions={
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-border-card rounded p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(''); }}
            className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 whitespace-nowrap transition-colors ${tab === t.id ? 'bg-dell-blue text-white' : 'text-text-secondary hover:text-text-primary hover:bg-row-hover'}`}
          >
            <t.Icon className="w-3.5 h-3.5" /> {t.label}
            {t.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-gray-100'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Organizations', value: tenants.length, Icon: Building2, color: 'text-dell-blue', bg: 'bg-dell-blue/10' },
              { label: 'Total Users', value: users.length, Icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Servers', value: servers.length, Icon: Server, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Active Sessions', value: sessions.length, Icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-border-card rounded p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                    <s.Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-2xl font-bold text-text-primary">{s.value}</span>
                </div>
                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Health Summary */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Server Health Summary</h2>
            </div>
            <div className="p-4 flex gap-6">
              {['HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN'].map((h) => {
                const count = servers.filter((s) => s.health === h).length;
                return (
                  <div key={h} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${healthColor(h)}`} />
                    <span className="text-sm text-text-primary font-medium">{count}</span>
                    <span className="text-xs text-text-secondary capitalize">{h.toLowerCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Recent Users</h2>
            </div>
            <div className="divide-y divide-border-card">
              {users.slice(0, 5).map((u) => (
                <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-text-primary">{u.email}</span>
                    {isSuperAdmin && u.tenant?.name && (
                      <span className="text-xs text-text-secondary ml-2">({u.tenant.name})</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${roleColor(u.role)}`}>{u.role}</span>
                </div>
              ))}
              {users.length === 0 && <div className="px-4 py-6 text-center text-sm text-text-secondary">No users found</div>}
            </div>
          </div>
        </div>
      )}

      {/* Tenants / Organizations */}
      {tab === 'tenants' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Organizations</h2>
            <span className="text-xs text-text-secondary">{tenants.length} total</span>
          </div>
          <div className="divide-y divide-border-card">
            {tenants.map((t) => {
              const tUsers = users.filter((u) => u.tenantId === t.id);
              const tServers = servers.filter((s) => s.tenantId === t.id);
              const isExpanded = expandedTenant === t.id;
              return (
                <div key={t.id}>
                  <button onClick={() => setExpandedTenant(isExpanded ? null : t.id)} className="w-full text-left px-4 py-3 hover:bg-row-hover transition-colors flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                        {t.slug === 'system' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-dell-blue text-white">System</span>}
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary">{t.plan}</span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">Slug: {t.slug} · Created {new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-secondary shrink-0">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tUsers.length}</span>
                      <span className="flex items-center gap-1"><Server className="w-3 h-3" /> {tServers.length}</span>
                      {isSuperAdmin && t.slug !== 'system' && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); deleteTenant(t.id); }} className="text-red-critical hover:underline">
                          Delete org
                        </button>
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="bg-bg-body px-6 py-4 border-t border-border-card">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Users ({tUsers.length})</h4>
                          {tUsers.length > 0 ? (
                            <div className="space-y-1">
                              {tUsers.map((u) => (
                                <div key={u.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-border-card">
                                  <span className="text-sm text-text-primary">{u.email}</span>
                                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${roleColor(u.role)}`}>{u.role}</span>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-xs text-text-secondary">No users</p>}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Servers ({tServers.length})</h4>
                          {tServers.length > 0 && !isSuperAdmin ? (
                            <div className="space-y-1">
                              {tServers.map((s) => (
                                <div key={s.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-border-card">
                                  <span className="text-sm text-text-primary">{s.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-text-secondary font-mono">{s.ip}</span>
                                    <div className={`w-2.5 h-2.5 rounded-full ${healthColor(s.health)}`} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : isSuperAdmin ? (
                            <p className="text-xs text-text-secondary">Server details hidden for platform admin.</p>
                          ) : <p className="text-xs text-text-secondary">No servers</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {tenants.length === 0 && <div className="px-4 py-8 text-center text-sm text-text-secondary">No organizations found</div>}
          </div>
        </div>
      )}

      {/* All Users */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by email or organization..."
              className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
          </div>
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Users ({filteredUsers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-row-alt border-b border-border-card">
                    <th className="text-left p-3 font-semibold text-text-primary">Email</th>
                    {isSuperAdmin && <th className="text-left p-3 font-semibold text-text-primary">Organization</th>}
                    <th className="text-left p-3 font-semibold text-text-primary">Role</th>
                    <th className="text-left p-3 font-semibold text-text-primary">Created</th>
                    <th className="text-left p-3 font-semibold text-text-primary">Last Login</th>
                    <th className="text-right p-3 font-semibold text-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                      <td className="p-3 font-medium">{u.email}</td>
                      {isSuperAdmin && <td className="p-3 text-text-secondary">{u.tenant?.name || '—'}</td>}
                      <td className="p-3"><span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${roleColor(u.role)}`}>{u.role}</span></td>
                      <td className="p-3 text-text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-text-secondary">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                      <td className="p-3 text-right space-x-1">
                        <button type="button" onClick={() => resetUserPassword(u.id)} className="px-2 py-1 text-xs rounded bg-amber-50 text-amber-800 hover:bg-amber-100 inline-flex items-center gap-1">
                          <KeyRound className="w-3 h-3" /> Reset
                        </button>
                        {isPrimaryPlatformAdmin(u) ? (
                          <span className="text-[10px] text-text-secondary">Protected</span>
                        ) : (
                          <button type="button" onClick={() => deleteUser(u.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-critical hover:bg-red-100 inline-flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">No users found</div>}
            </div>
          </div>
        </div>
      )}

      {/* All Servers — platform admin sees inventory only (no IPs/names) */}
      {tab === 'servers' && (
        <div className="space-y-4">
          {isSuperAdmin && (
            <p className="text-xs text-text-secondary bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Platform admin view: server hostnames and iDRAC IPs are hidden. You can remove records only.
            </p>
          )}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">
                Servers ({isSuperAdmin ? serverInv.length : filteredServers.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-row-alt border-b border-border-card">
                    {isSuperAdmin ? (
                      <>
                        <th className="text-left p-3 font-semibold">Record ID</th>
                        <th className="text-left p-3 font-semibold">Organization</th>
                        <th className="text-left p-3 font-semibold">Generation</th>
                        <th className="text-left p-3 font-semibold">Health</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">IP</th>
                        <th className="text-left p-3 font-semibold">Generation</th>
                        <th className="text-left p-3 font-semibold">Health</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isSuperAdmin
                    ? serverInv.map((s, i) => (
                        <tr key={s.id} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                          <td className="p-3 font-mono text-xs">{s.id.slice(0, 8)}…</td>
                          <td className="p-3">{s.tenant?.name || '—'}</td>
                          <td className="p-3">{s.generation?.replace('GEN', 'Gen ')}</td>
                          <td className="p-3 capitalize">{s.health?.toLowerCase()}</td>
                          <td className="p-3 text-right">
                            <button type="button" onClick={() => deleteServerRecord(s.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-critical">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    : filteredServers.map((s, i) => (
                        <tr key={s.id} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3 font-mono text-xs">{s.ip}</td>
                          <td className="p-3">{s.generation?.replace('GEN', 'Gen ')}</td>
                          <td className="p-3 capitalize">{s.health?.toLowerCase()}</td>
                          <td className="p-3 text-right">
                            <button type="button" onClick={() => deleteServerRecord(s.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-critical">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && isSuperAdmin && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Audit logs ({auditLogs.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt border-b border-border-card">
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Organization</th>
                <th className="text-left p-3">When</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((row) => (
                <tr key={row.id} className="border-t border-border-card">
                  <td className="p-3 font-mono text-xs">{row.action}</td>
                  <td className="p-3">{row.user?.email || '—'}</td>
                  <td className="p-3">{row.tenant?.name || '—'}</td>
                  <td className="p-3 text-text-secondary">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => deleteAuditRow(row.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-critical">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Active Sessions */}
      {tab === 'sessions' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Active Sessions ({sessions.length})</h2>
            {sessions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" /> Revoking a session will force the user to re-authenticate
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-row-alt border-b border-border-card">
                  <th className="text-left p-3 font-semibold text-text-primary">User</th>
                  <th className="text-left p-3 font-semibold text-text-primary">IP Address</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Device</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Created</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Expires</th>
                  <th className="text-right p-3 font-semibold text-text-primary">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.id} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                    <td className="p-3 font-medium">{s.user?.email || '—'}</td>
                    <td className="p-3 font-mono text-xs">{s.ip}</td>
                    <td className="p-3 text-xs text-text-secondary max-w-[200px] truncate">{s.userAgent}</td>
                    <td className="p-3 text-text-secondary">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="p-3 text-text-secondary">{new Date(s.expiresAt).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => revokeSession(s.id)} className="px-3 py-1 bg-red-50 text-red-critical text-xs font-semibold rounded hover:bg-red-100 transition-colors">
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">No active sessions</div>}
          </div>
        </div>
      )}
    </>
  );
}
