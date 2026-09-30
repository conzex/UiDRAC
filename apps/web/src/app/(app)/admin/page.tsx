/** Admin Panel — Super admin dashboard for cross-tenant management.
 *  Includes: Overview, Organizations, Users, Servers, Sessions, Audit, Plans & Pricing, SMTP Config.
 */
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Building2, Server, Activity, Trash2, Search, RefreshCw,
  ChevronDown, ChevronRight, Eye, Clock, AlertTriangle, FileText, KeyRound,
  CreditCard, Mail, Save, DollarSign, Check, Plus, Pencil, X, Loader2, Send, Copy,
} from 'lucide-react';
import api from '@/lib/api';
import AppPageHeader from '@/components/layout/app-page-header';
import ConfirmModal from '@/components/ui/confirm-modal';
import AppModal from '@/components/ui/app-modal';
import { PRIMARY_PLATFORM_ADMIN_EMAIL } from '@idrac/shared';

interface Tenant { id: string; name: string; slug: string; plan: string; createdAt: string; _count?: { users: number; servers: number } }
interface UserRow { id: string; email: string; role: string; tenantId: string; createdAt: string; lastLoginAt: string | null; tenant?: { name: string } }
interface ServerRow { id: string; name: string; ip: string; generation: string; health: string; tenantId: string; createdAt: string; tenant?: { name: string } }
interface SessionRow { id: string; userId: string; ip: string; userAgent: string; expiresAt: string; createdAt: string; user?: { email: string } }
interface AuditRow { id: string; action: string; createdAt: string; tenantId: string; user?: { email: string }; tenant?: { name: string } }
interface ServerInvRow { id: string; tenantId: string; generation: string; health: string; createdAt: string; tenant?: { name: string } }
interface PlanTier { name: string; sites: number; servers: number; price: number; label: string }

type Tab = 'overview' | 'tenants' | 'users' | 'servers' | 'sessions' | 'audit' | 'plans' | 'smtp';

const INITIAL_PLANS: PlanTier[] = [
  { name: 'Starter', sites: 1, servers: 3, price: 0, label: 'Free' },
  { name: 'Pro', sites: 2, servers: 10, price: 4.99, label: '$4.99/mo' },
  { name: 'Business', sites: 5, servers: 25, price: 12.99, label: '$12.99/mo' },
  { name: 'Enterprise', sites: -1, servers: -1, price: -1, label: 'Contact sales' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
];

function cardHeader(title: string) {
  return (
    <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">{title}</h2>
    </div>
  );
}

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
  const [agentProvisioned, setAgentProvisioned] = useState(0);
  const [agentConnected, setAgentConnected] = useState(0);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmLabel, setConfirmLabel] = useState('Confirm');
  const [confirmVariant, setConfirmVariant] = useState<'danger' | 'warning' | 'info'>('danger');
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  // Info alert modal
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState<'danger' | 'warning' | 'info'>('info');

  // Plans & pricing state
  const [currency, setCurrency] = useState('USD');
  const [addonPrice, setAddonPrice] = useState('1.99');
  const [plans, setPlans] = useState<PlanTier[]>(INITIAL_PLANS);
  const [plansSaved, setPlansSaved] = useState(false);

  // Plan edit modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanIdx, setEditingPlanIdx] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState<PlanTier>({ name: '', sites: 1, servers: 3, price: 0, label: 'Free' });

  // SMTP state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpVerified, setSmtpVerified] = useState(false);

  // Billing settings modal
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingCurrency, setBillingCurrency] = useState(currency);
  const [billingAddonPrice, setBillingAddonPrice] = useState(addonPrice);

  // Copy-to-clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const showConfirm = useCallback((title: string, message: string, label: string, variant: 'danger' | 'warning' | 'info', callback: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmLabel(label);
    setConfirmVariant(variant);
    setConfirmCallback(() => callback);
    setConfirmOpen(true);
  }, []);

  const showAlert = useCallback((title: string, message: string, variant: 'danger' | 'warning' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVariant(variant);
    setAlertOpen(true);
  }, []);

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

      if (superAdmin) {
        try {
          const statsRes = await api.get('/admin/agents/stats');
          setAgentProvisioned(statsRes.data?.total ?? 0);
          setAgentConnected(statsRes.data?.active ?? 0);
        } catch {
          setAgentProvisioned(0);
          setAgentConnected(0);
        }
      } else {
        try {
          const liveRes = await api.get('/agents/live');
          const rows = liveRes.data?.agents ?? [];
          setAgentProvisioned(rows.length);
          setAgentConnected(rows.filter((a: { status?: string }) => a.status === 'connected').length);
        } catch {
          setAgentProvisioned(0);
          setAgentConnected(0);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const deleteUser = (userId: string) => {
    showConfirm('Delete user', 'Delete this user and all associated sessions? This action cannot be undone.', 'Delete user', 'danger', async () => {
      try {
        if (isSuperAdmin) await api.delete(`/admin/users/${userId}`);
        else await api.delete(`/tenant/users/${userId}`);
        loadData();
      } catch (e: any) {
        showAlert('Error', e.response?.data?.message || 'Delete failed', 'danger');
      }
    });
  };

  const resetUserPassword = (userId: string) => {
    showConfirm('Reset password', 'Generate a new temporary password for this user? It will be sent to the email on file.', 'Reset password', 'warning', async () => {
      try {
        const res = isSuperAdmin
          ? await api.post(`/admin/users/${userId}/reset-password`)
          : await api.post(`/tenant/users/${userId}/reset-password`);
        showAlert('Password reset', res.data.message || 'Password reset email sent to the address on file for this account.', 'info');
      } catch (e: any) {
        showAlert('Error', e.response?.data?.message || 'Reset failed', 'danger');
      }
    });
  };

  const deleteTenant = (tenantId: string) => {
    showConfirm('Delete organization', 'Delete this organization and ALL its data (users, servers, logs)? This cannot be undone.', 'Delete organization', 'danger', async () => {
      try {
        await api.delete(`/admin/tenants/${tenantId}`);
        loadData();
      } catch (e: any) {
        showAlert('Error', e.response?.data?.message || 'Delete failed', 'danger');
      }
    });
  };

  const deleteServerRecord = (serverId: string) => {
    showConfirm('Delete server', 'Delete this server record? This cannot be undone.', 'Delete server', 'danger', async () => {
      try {
        if (isSuperAdmin) await api.delete(`/admin/servers/${serverId}`);
        else await api.delete(`/servers/${serverId}`);
        loadData();
      } catch (e: any) {
        showAlert('Error', e.response?.data?.message || 'Delete failed', 'danger');
      }
    });
  };

  const deleteAuditRow = (id: string) => {
    showConfirm('Delete audit entry', 'Delete this audit log entry?', 'Delete', 'warning', async () => {
      try {
        await api.delete(`/admin/audit/${id}`);
        setAuditLogs((rows) => rows.filter((r) => r.id !== id));
      } catch (e: any) {
        showAlert('Error', e.response?.data?.message || 'Delete failed', 'danger');
      }
    });
  };

  const revokeSession = (sessionId: string) => {
    showConfirm('Revoke session', 'This will force the user to re-authenticate. Continue?', 'Revoke', 'warning', async () => {
      try {
        await api.delete(`/auth/sessions/${sessionId}`);
        setSessions((s) => s.filter((ss) => ss.id !== sessionId));
      } catch { /* ignore */ }
    });
  };

  const revokeAllSessions = () => {
    showConfirm('Revoke ALL sessions', `This will terminate all ${sessions.length} active session(s) and force every user to re-login. Continue?`, 'Revoke all sessions', 'danger', async () => {
      try {
        await api.post('/admin/sessions/revoke-all');
        setSessions([]);
        showAlert('Sessions revoked', 'All active sessions have been terminated. Users must re-login.', 'info');
      } catch (e: any) {
        showAlert('Error', e.response?.data?.message || 'Failed to revoke sessions', 'danger');
      }
    });
  };

  // Plan tier modal helpers
  const openAddPlan = () => {
    setEditingPlanIdx(null);
    setPlanForm({ name: '', sites: 1, servers: 3, price: 0, label: '' });
    setPlanModalOpen(true);
  };
  const openEditPlan = (idx: number) => {
    setEditingPlanIdx(idx);
    setPlanForm({ ...plans[idx] });
    setPlanModalOpen(true);
  };
  const savePlanTier = () => {
    const label = planForm.price === 0 ? 'Free' : planForm.price === -1 ? 'Contact sales' : `${currencySymbol}${planForm.price.toFixed(2)}/mo`;
    const tier: PlanTier = { ...planForm, label };
    if (editingPlanIdx !== null) {
      setPlans((prev) => prev.map((p, i) => (i === editingPlanIdx ? tier : p)));
    } else {
      setPlans((prev) => [...prev, tier]);
    }
    setPlanModalOpen(false);
  };
  const removePlan = (idx: number) => {
    showConfirm('Remove plan tier', `Remove "${plans[idx].name}" from the list?`, 'Remove', 'warning', () => {
      setPlans((prev) => prev.filter((_, i) => i !== idx));
    });
  };

  const savePlanSettings = () => {
    setPlansSaved(true);
    setTimeout(() => setPlansSaved(false), 2000);
  };

  const openBillingSettings = () => {
    setBillingCurrency(currency);
    setBillingAddonPrice(addonPrice);
    setBillingModalOpen(true);
  };
  const saveBillingSettings = () => {
    setCurrency(billingCurrency);
    setAddonPrice(billingAddonPrice);
    setBillingModalOpen(false);
  };

  // SMTP — test first, then save
  const testSmtpConnection = async () => {
    if (!smtpHost.trim()) {
      setSmtpTestResult({ success: false, message: 'SMTP host is required.' });
      return;
    }
    setSmtpTesting(true);
    setSmtpTestResult(null);
    setSmtpVerified(false);
    try {
      const res = await api.post('/admin/smtp/test', {
        host: smtpHost,
        port: parseInt(smtpPort || '587', 10),
        secure: smtpSecure,
        user: smtpUser || undefined,
        pass: smtpPass || undefined,
        from: smtpFrom || `noreply@${smtpHost}`,
        testRecipient: smtpTestEmail.trim() || undefined,
      });
      setSmtpTestResult(res.data);
      if (res.data.success) setSmtpVerified(true);
    } catch (e: any) {
      setSmtpTestResult({ success: false, message: e.response?.data?.message || 'Connection failed.' });
    } finally {
      setSmtpTesting(false);
    }
  };

  const saveSmtpSettings = () => {
    if (!smtpVerified) {
      showAlert('Verify first', 'Please test and verify the SMTP connection before saving.', 'warning');
      return;
    }
    setSmtpSaved(true);
    setTimeout(() => setSmtpSaved(false), 2000);
  };

  const updateSmtpField = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setSmtpVerified(false);
    setSmtpTestResult(null);
  };

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '$';

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
    { id: 'sessions', label: 'Sessions', Icon: Clock, count: sessions.length },
    ...(isSuperAdmin ? [
      { id: 'audit' as Tab, label: 'Audit', Icon: FileText, count: auditLogs.length },
      { id: 'plans' as Tab, label: 'Plans & Pricing', Icon: CreditCard },
      { id: 'smtp' as Tab, label: 'SMTP', Icon: Mail },
    ] : []),
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

      {/* ═══════ Overview ═══════ */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                label: 'Organizations',
                value: tenants.length,
                Icon: Building2,
                color: 'text-dell-blue',
                bg: 'bg-dell-blue/10',
              },
              { label: 'Users', value: users.length, Icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
              {
                label: 'Servers',
                value: isSuperAdmin ? serverInv.length : servers.length,
                Icon: Server,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
              { label: 'Sessions', value: sessions.length, Icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
              {
                label: isSuperAdmin ? 'Agents (all tenants)' : 'Agents (org)',
                value: agentProvisioned,
                sub: agentConnected > 0 ? `${agentConnected} active` : undefined,
                Icon: Activity,
                color: 'text-dell-blue',
                bg: 'bg-dell-blue/10',
              },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-border-card rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                    <s.Icon className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold text-text-primary tabular-nums">{s.value}</span>
                </div>
                <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wide leading-snug">
                  {s.label}
                </div>
                {'sub' in s && s.sub && <div className="text-[11px] text-green-700 mt-1">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="bg-white border border-border-card rounded">
            {cardHeader('Server Health Summary')}
            <div className="p-4 flex gap-6">
              {['HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN'].map((h) => {
                const count = (isSuperAdmin ? serverInv : servers).filter((s) => s.health === h).length;
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

          <div className="bg-white border border-border-card rounded">
            {cardHeader('Recent Users')}
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

      {/* ═══════ Organizations ═══════ */}
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

      {/* ═══════ All Users ═══════ */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by email or organization..."
              className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
          </div>
          <div className="bg-white border border-border-card rounded">
            {cardHeader(`Users (${filteredUsers.length})`)}
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
                        <button type="button" onClick={() => resetUserPassword(u.id)} className="px-2 py-1 text-xs rounded border border-amber-200 text-amber-800 bg-white hover:bg-amber-50 inline-flex items-center gap-1">
                          <KeyRound className="w-3 h-3" /> Reset
                        </button>
                        {isPrimaryPlatformAdmin(u) ? (
                          <span className="text-[10px] text-text-secondary">Protected</span>
                        ) : (
                          <button type="button" onClick={() => deleteUser(u.id)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-critical bg-white hover:bg-red-50 inline-flex items-center gap-1">
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

      {/* ═══════ All Servers ═══════ */}
      {tab === 'servers' && (
        <div className="space-y-4">
          {isSuperAdmin && (
            <p className="text-xs text-text-secondary bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Platform admin view: server hostnames and iDRAC IPs are hidden. You can remove records only.
            </p>
          )}
          <div className="bg-white border border-border-card rounded">
            {cardHeader(`Servers (${isSuperAdmin ? serverInv.length : filteredServers.length})`)}
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
                          <td className="p-3 font-mono text-xs">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(s.id)}
                              className="inline-flex items-center gap-1.5 hover:text-dell-blue transition-colors group"
                              title="Click to copy full ID"
                            >
                              {s.id.slice(0, 8)}…
                              {copiedId === s.id
                                ? <Check className="w-3 h-3 text-green-healthy" />
                                : <Copy className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                          </td>
                          <td className="p-3">{s.tenant?.name || '—'}</td>
                          <td className="p-3">{s.generation?.replace('GEN', 'Gen ')}</td>
                          <td className="p-3 capitalize">{s.health?.toLowerCase()}</td>
                          <td className="p-3 text-right">
                            <button type="button" onClick={() => deleteServerRecord(s.id)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-critical bg-white hover:bg-red-50">
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
                            <button type="button" onClick={() => deleteServerRecord(s.id)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-critical bg-white hover:bg-red-50">
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

      {/* ═══════ Audit Logs ═══════ */}
      {tab === 'audit' && isSuperAdmin && (
        <div className="bg-white border border-border-card rounded">
          {cardHeader(`Audit logs (${auditLogs.length})`)}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt border-b border-border-card">
                <th className="text-left p-3 font-semibold">Action</th>
                <th className="text-left p-3 font-semibold">User</th>
                <th className="text-left p-3 font-semibold">Organization</th>
                <th className="text-left p-3 font-semibold">When</th>
                <th className="text-right p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((row, i) => (
                <tr key={row.id} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                  <td className="p-3 font-mono text-xs">{row.action}</td>
                  <td className="p-3">{row.user?.email || '—'}</td>
                  <td className="p-3">{row.tenant?.name || '—'}</td>
                  <td className="p-3 text-text-secondary">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => deleteAuditRow(row.id)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-critical bg-white hover:bg-red-50">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditLogs.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">No audit logs yet. Actions will appear here after users interact with the system.</div>}
        </div>
      )}

      {/* ═══════ Sessions ═══════ */}
      {tab === 'sessions' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Active Sessions ({sessions.length})</h2>
            <div className="flex items-center gap-3">
              {sessions.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-warning">
                  <AlertTriangle className="w-3 h-3" /> Revoking forces re-authentication
                </span>
              )}
              {isSuperAdmin && sessions.length > 0 && (
                <button
                  type="button"
                  onClick={revokeAllSessions}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-red-200 text-red-critical bg-white hover:bg-red-50 transition-colors"
                >
                  Revoke all
                </button>
              )}
            </div>
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
                      <button onClick={() => revokeSession(s.id)} className="px-3 py-1 border border-red-200 text-red-critical bg-white text-xs font-semibold rounded hover:bg-red-50 transition-colors">
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

      {/* ═══════ Plans & Pricing ═══════ */}
      {tab === 'plans' && isSuperAdmin && (
        <div className="space-y-4">
          {/* Billing summary — opens lightbox to edit */}
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Billing settings</h2>
              <button type="button" onClick={openBillingSettings} className="h-8 px-3 text-xs font-semibold rounded border border-dell-blue text-dell-blue hover:bg-dell-blue hover:text-white inline-flex items-center gap-1 transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Default billing currency</div>
                <div className="text-sm font-medium text-text-primary">{CURRENCIES.find((c) => c.code === currency)?.label ?? currency}</div>
                <p className="text-[11px] text-text-secondary mt-0.5">All plan prices and invoices will display in this currency.</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Agent addon pricing</div>
                <div className="text-sm font-medium text-text-primary">{currencySymbol}{parseFloat(addonPrice).toFixed(2)} <span className="text-text-secondary font-normal">/mo per agent</span></div>
                <p className="text-[11px] text-text-secondary mt-0.5">Charged when a user exceeds their plan&apos;s included agent count.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Plan tiers (recurring monthly)</h2>
              <button type="button" onClick={openAddPlan} className="h-8 px-3 text-xs font-semibold rounded border border-dell-blue text-dell-blue hover:bg-dell-blue hover:text-white inline-flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Add tier
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-row-alt border-b border-border-card">
                    <th className="text-left p-3 font-semibold">Plan</th>
                    <th className="text-center p-3 font-semibold">Sites (agents)</th>
                    <th className="text-center p-3 font-semibold">Servers</th>
                    <th className="text-right p-3 font-semibold">Monthly price</th>
                    <th className="text-right p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p, i) => (
                    <tr key={`${p.name}-${i}`} className={`border-t border-border-card ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                      <td className="p-3 font-semibold text-text-primary">
                        {p.name}
                        {i === 0 && <span className="ml-2 text-[10px] font-semibold text-green-healthy bg-green-50 px-1.5 py-0.5 rounded">Default</span>}
                      </td>
                      <td className="p-3 text-center">{p.sites === -1 ? 'Unlimited' : p.sites}</td>
                      <td className="p-3 text-center">{p.servers === -1 ? 'Unlimited' : p.servers}</td>
                      <td className="p-3 text-right font-semibold text-dell-blue">
                        {p.price === 0 ? 'Free' : p.price === -1 ? 'Contact sales' : `${currencySymbol}${p.price.toFixed(2)}/mo`}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button type="button" onClick={() => openEditPlan(i)} className="px-2 py-1 text-xs rounded border border-border-card bg-white hover:bg-row-hover inline-flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button type="button" onClick={() => removePlan(i)} className="px-2 py-1 text-xs rounded border border-red-200 text-red-critical bg-white hover:bg-red-50 inline-flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={savePlanSettings}
              className="px-5 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover inline-flex items-center gap-2"
            >
              {plansSaved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save plan settings</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══════ SMTP Configuration ═══════ */}
      {tab === 'smtp' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="bg-white border border-border-card rounded">
            {cardHeader('SMTP Mail Server')}
            <div className="p-4 space-y-4">
              <p className="text-xs text-text-secondary">
                Configure the outgoing mail server for password reset emails, upgrade requests, and system notifications.
                <span className="font-semibold text-dell-blue ml-1">You must test and verify the connection before saving.</span>
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">SMTP host</label>
                  <input
                    value={smtpHost}
                    onChange={(e) => updateSmtpField(setSmtpHost)(e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full px-3 py-2 text-sm border border-border-card rounded"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Port</label>
                  <input
                    value={smtpPort}
                    onChange={(e) => updateSmtpField(setSmtpPort)(e.target.value)}
                    placeholder="587"
                    className="w-full px-3 py-2 text-sm border border-border-card rounded"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Username</label>
                  <input
                    value={smtpUser}
                    onChange={(e) => updateSmtpField(setSmtpUser)(e.target.value)}
                    placeholder="noreply@example.com"
                    className="w-full px-3 py-2 text-sm border border-border-card rounded"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => updateSmtpField(setSmtpPass)(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-border-card rounded"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">From address</label>
                <input
                  value={smtpFrom}
                  onChange={(e) => updateSmtpField(setSmtpFrom)(e.target.value)}
                  placeholder="UiDRAC Console <noreply@uidrac.cloud.conzex.com>"
                  className="w-full px-3 py-2 text-sm border border-border-card rounded"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => updateSmtpField(setSmtpSecure)(e.target.checked)}
                    className="accent-dell-blue"
                  />
                  <span className="text-sm text-text-primary">Use TLS/SSL</span>
                </label>
                <span className="text-[11px] text-text-secondary">(Recommended for port 587 / 465)</span>
              </div>

              {/* Test section */}
              <div className="border-t border-border-card pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Test connection</h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs text-text-secondary">Test recipient (optional — leave blank for auth-only test)</label>
                    <input
                      value={smtpTestEmail}
                      onChange={(e) => setSmtpTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full px-3 py-2 text-sm border border-border-card rounded"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={smtpTesting || !smtpHost.trim()}
                    onClick={testSmtpConnection}
                    className="h-9 px-4 text-sm font-semibold rounded bg-dell-blue text-white hover:bg-dell-blue-hover disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                  >
                    {smtpTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {smtpTesting ? 'Testing…' : 'Test & Verify'}
                  </button>
                </div>
                {smtpTestResult && (
                  <div className={`px-3 py-2 rounded border text-sm ${smtpTestResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {smtpTestResult.success ? <Check className="w-4 h-4 inline mr-1.5" /> : <X className="w-4 h-4 inline mr-1.5" />}
                    {smtpTestResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-card rounded">
            {cardHeader('Environment variables')}
            <div className="p-4">
              <p className="text-xs text-text-secondary mb-3">
                Alternatively, set these as environment variables on the API container. UI values above take priority.
              </p>
              <pre className="text-[11px] font-mono bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto">
{`SMTP_HOST=${smtpHost || 'smtp.example.com'}
SMTP_PORT=${smtpPort || '587'}
SMTP_USER=${smtpUser || 'noreply@example.com'}
SMTP_PASS=<your-password>
SMTP_FROM=${smtpFrom || 'UiDRAC Console <noreply@uidrac.cloud.conzex.com>'}
SMTP_SECURE=${smtpSecure ? 'true' : 'false'}`}
              </pre>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {!smtpVerified && (
              <p className="text-xs text-amber-warning self-center">Verify SMTP connection before saving</p>
            )}
            <button
              type="button"
              disabled={!smtpVerified}
              onClick={saveSmtpSettings}
              className="px-5 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover disabled:opacity-50 inline-flex items-center gap-2"
            >
              {smtpSaved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save SMTP settings</>}
            </button>
          </div>
        </div>
      )}

      {/* Plan tier edit/add modal */}
      <AppModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlanIdx !== null ? `Edit plan: ${plans[editingPlanIdx]?.name}` : 'Add new plan tier'}
        subtitle="Configure plan limits and pricing"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Plan name</label>
            <input
              value={planForm.name}
              onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Pro, Business"
              className="w-full px-3 py-2 text-sm border border-border-card rounded"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Sites (agents)</label>
              <input
                type="number"
                value={planForm.sites}
                onChange={(e) => setPlanForm((f) => ({ ...f, sites: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-border-card rounded"
              />
              <p className="text-[10px] text-text-secondary">Use -1 for unlimited</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Servers</label>
              <input
                type="number"
                value={planForm.servers}
                onChange={(e) => setPlanForm((f) => ({ ...f, servers: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-border-card rounded"
              />
              <p className="text-[10px] text-text-secondary">Use -1 for unlimited</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Monthly price ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              value={planForm.price}
              onChange={(e) => setPlanForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 text-sm border border-border-card rounded"
            />
            <p className="text-[10px] text-text-secondary">Use 0 for free, -1 for &quot;Contact sales&quot;</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPlanModalOpen(false)}
              className="h-9 px-4 text-sm font-semibold border border-border-card rounded bg-white hover:bg-row-hover text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!planForm.name.trim()}
              onClick={savePlanTier}
              className="h-9 px-4 text-sm font-semibold bg-dell-blue text-white rounded hover:bg-dell-blue-hover disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> {editingPlanIdx !== null ? 'Update tier' : 'Add tier'}
            </button>
          </div>
        </div>
      </AppModal>

      {/* Billing settings modal */}
      <AppModal
        open={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        title="Billing settings"
        subtitle="Configure default currency and agent addon pricing"
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Default billing currency</label>
            <select
              value={billingCurrency}
              onChange={(e) => setBillingCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-card rounded bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-text-secondary">All plan prices and invoices will display in this currency.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Price per additional agent (monthly)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{CURRENCIES.find((c) => c.code === billingCurrency)?.symbol ?? '$'}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={billingAddonPrice}
                onChange={(e) => setBillingAddonPrice(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-border-card rounded"
              />
              <span className="text-xs text-text-secondary">/mo per agent</span>
            </div>
            <p className="text-[11px] text-text-secondary">Charged when a user exceeds their plan&apos;s included agent count.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBillingModalOpen(false)}
              className="h-9 px-4 text-sm font-semibold border border-border-card rounded bg-white hover:bg-row-hover text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveBillingSettings}
              className="h-9 px-4 text-sm font-semibold bg-dell-blue text-white rounded hover:bg-dell-blue-hover inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </AppModal>

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        variant={confirmVariant}
        onConfirm={() => {
          setConfirmOpen(false);
          confirmCallback?.();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Alert/info modal */}
      <ConfirmModal
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        confirmLabel="OK"
        cancelLabel=""
        variant={alertVariant}
        onConfirm={() => setAlertOpen(false)}
        onCancel={() => setAlertOpen(false)}
      />
    </>
  );
}
