/** Admin Panel — Super admin dashboard for cross-tenant management. */
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Building2, Server, Activity, Trash2, Search, RefreshCw,
  ChevronDown, ChevronRight, Eye, Clock, AlertTriangle,
} from 'lucide-react';
import AppShell from '@/components/layout/app-shell';
import api from '@/lib/api';

interface Tenant { id: string; name: string; slug: string; plan: string; createdAt: string; _count?: { users: number; servers: number } }
interface UserRow { id: string; email: string; role: string; tenantId: string; createdAt: string; lastLoginAt: string | null; tenant?: { name: string } }
interface ServerRow { id: string; name: string; ip: string; generation: string; health: string; tenantId: string; createdAt: string; tenant?: { name: string } }
interface SessionRow { id: string; userId: string; ip: string; userAgent: string; expiresAt: string; createdAt: string; user?: { email: string } }

type Tab = 'overview' | 'tenants' | 'users' | 'servers' | 'sessions';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'OWNER') {
      router.push('/dashboard');
      return;
    }
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
      setTenants(tData);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setServers(Array.isArray(sRes.data) ? sRes.data : []);
      setSessions(Array.isArray(sessRes.data) ? sessRes.data : []);
      setIsSuperAdmin(tData.length > 1 || tData.some((t: Tenant) => t.slug === 'system'));
    } catch { /* ignore */ }
    setLoading(false);
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

  const filteredUsers = search ? users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.tenant?.name?.toLowerCase().includes(search.toLowerCase())) : users;
  const filteredServers = search ? servers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.ip.includes(search) || s.tenant?.name?.toLowerCase().includes(search.toLowerCase())) : servers;

  const tabs: { id: Tab; label: string; Icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', Icon: Activity },
    { id: 'tenants', label: 'Organizations', Icon: Building2, count: tenants.length },
    { id: 'users', label: 'All Users', Icon: Users, count: users.length },
    { id: 'servers', label: 'All Servers', Icon: Server, count: servers.length },
    { id: 'sessions', label: 'Active Sessions', Icon: Clock, count: sessions.length },
  ];

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-dell-blue" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-dell-blue text-white flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Admin Panel</h1>
            <p className="text-xs text-text-secondary">
              {isSuperAdmin ? 'Super Admin — Cross-tenant management' : 'Organization Administration'}
            </p>
          </div>
        </div>
        <button onClick={loadData} className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

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
                          {tServers.length > 0 ? (
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
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">No users found</div>}
            </div>
          </div>
        </div>
      )}

      {/* All Servers */}
      {tab === 'servers' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search servers by name, IP, or organization..."
              className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
          </div>
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Servers ({filteredServers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-row-alt border-b border-border-card">
                    <th className="text-left p-3 font-semibold text-text-primary">Name</th>
                    <th className="text-left p-3 font-semibold text-text-primary">IP Address</th>
                    {isSuperAdmin && <th className="text-left p-3 font-semibold text-text-primary">Organization</th>}
                    <th className="text-left p-3 font-semibold text-text-primary">Generation</th>
                    <th className="text-left p-3 font-semibold text-text-primary">Health</th>
                    <th className="text-left p-3 font-semibold text-text-primary">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServers.map((s, i) => (
                    <tr key={s.id} className={`border-t border-border-card hover:bg-row-hover cursor-pointer ${i % 2 === 1 ? 'bg-row-alt' : ''}`} onClick={() => router.push(`/servers/${s.id}`)}>
                      <td className="p-3 font-medium text-dell-blue">{s.name}</td>
                      <td className="p-3 font-mono text-xs">{s.ip}</td>
                      {isSuperAdmin && <td className="p-3 text-text-secondary">{s.tenant?.name || '—'}</td>}
                      <td className="p-3"><span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100">{s.generation?.replace('GEN', 'Gen ')}</span></td>
                      <td className="p-3"><div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${healthColor(s.health)}`} /><span className="text-xs capitalize">{s.health?.toLowerCase()}</span></div></td>
                      <td className="p-3 text-text-secondary">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredServers.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">No servers found</div>}
            </div>
          </div>
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
    </AppShell>
  );
}
