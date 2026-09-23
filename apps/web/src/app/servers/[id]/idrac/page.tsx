/** iDRAC Settings page — Network, Users, Virtual Media, Certificates, Licenses, Jobs. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Network, Users, Disc, ShieldCheck, Key, Briefcase, Download, Plus, Trash2, RefreshCw, AlertTriangle, Save } from 'lucide-react';
import api from '@/lib/api';

type Tab = 'network' | 'users' | 'vmedia' | 'certs' | 'licenses' | 'jobs';

export default function IdracPage() {
  const { id } = useParams() as { id: string };
  const [tab, setTab] = useState<Tab>('network');
  const [network, setNetwork] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [vmedia, setVmedia] = useState<any>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    const results = await Promise.allSettled([
      api.get(`/servers/${id}/idrac-network`),
      api.get(`/servers/${id}/idrac-users`),
      api.get(`/servers/${id}/virtual-media`),
      api.get(`/servers/${id}/certificates`),
      api.get(`/servers/${id}/licenses`),
      api.get(`/servers/${id}/lc-jobs`),
    ]);
    if (results[0].status === 'fulfilled') setNetwork(results[0].value.data);
    if (results[1].status === 'fulfilled') setUsers(results[1].value.data || []);
    if (results[2].status === 'fulfilled') setVmedia(results[2].value.data);
    if (results[3].status === 'fulfilled') setCerts(results[3].value.data || []);
    if (results[4].status === 'fulfilled') setLicenses(results[4].value.data || []);
    if (results[5].status === 'fulfilled') setJobs(results[5].value.data || []);
    const firstErr = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (firstErr && !network && users.length === 0) setError(firstErr.reason?.response?.data?.message || 'Unable to load iDRAC settings.');
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  // Virtual Media
  const [mountUrl, setMountUrl] = useState('');
  const handleMount = async () => {
    if (!mountUrl) return;
    setActionMsg('');
    try {
      await api.post(`/servers/${id}/virtual-media/mount`, { image: mountUrl });
      setActionMsg('Virtual media mounted successfully.');
      setMountUrl('');
      fetchData();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to mount virtual media.'); }
  };
  const handleEject = async () => {
    try {
      await api.post(`/servers/${id}/virtual-media/eject`);
      setActionMsg('Virtual media ejected.');
      fetchData();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to eject.'); }
  };

  // SCP Export
  const handleScpExport = async (format: 'xml' | 'json') => {
    setActionMsg('Exporting Server Configuration Profile...');
    try {
      const { data } = await api.post(`/servers/${id}/scp/export`, { format });
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      setActionMsg(`SCP exported as ${data.filename}`);
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'SCP export failed.'); }
  };

  // Clear jobs
  const handleClearJobs = async () => {
    try {
      await api.delete(`/servers/${id}/lc-jobs`);
      setActionMsg('Job queue cleared.');
      fetchData();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to clear jobs.'); }
  };

  // User management
  const [newUser, setNewUser] = useState({ name: '', password: '', privilege: 'Administrator' });
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.password) return;
    try {
      await api.post(`/servers/${id}/idrac-users`, newUser);
      setActionMsg(`User "${newUser.name}" created.`);
      setNewUser({ name: '', password: '', privilege: 'Administrator' });
      fetchData();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to create user.'); }
  };
  const handleDeleteUser = async (userId: number) => {
    try {
      await api.delete(`/servers/${id}/idrac-users/${userId}`);
      setActionMsg('User deleted.');
      fetchData();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to delete user.'); }
  };

  const tabs: [Tab, any, string][] = [
    ['network', Network, 'Network'], ['users', Users, 'Users'], ['vmedia', Disc, 'Virtual Media'],
    ['certs', ShieldCheck, 'Certificates'], ['licenses', Key, 'Licenses'], ['jobs', Briefcase, 'Job Queue'],
  ];

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-12 bg-gray-200 rounded" /><div className="h-64 bg-gray-200 rounded" /></div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-0 bg-white border border-border-card rounded-t overflow-hidden">
        {tabs.map(([t, Icon, label]) => (
          <button key={t} onClick={() => { setTab(t); setActionMsg(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-dell-blue text-dell-blue bg-blue-50/30' : 'border-transparent text-text-secondary hover:text-dell-blue'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-dell-blue text-sm p-3 rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {actionMsg}
        </div>
      )}

      {/* Network */}
      {tab === 'network' && network && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">iDRAC Network Configuration</h2></div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {Object.entries({
              'DHCP Enabled': network.dhcpEnabled ? 'Yes' : 'No',
              'IP Address': network.ipAddress || '—',
              'Subnet Mask': network.subnetMask || '—',
              'Gateway': network.gateway || '—',
              'MAC Address': network.macAddress || '—',
              'Hostname': network.hostname || '—',
              'Domain Name': network.domainName || '—',
              'DNS Servers': network.dnsServers?.join(', ') || '—',
              'VLAN Enabled': network.vlanEnabled ? 'Yes' : 'No',
              'VLAN ID': network.vlanId ?? '—',
            }).map(([k, v]) => (
              <div key={k} className="flex py-1.5">
                <span className="w-1/2 text-sm text-text-secondary">{k}</span>
                <span className="w-1/2 text-sm font-medium font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">iDRAC User Accounts</h2>
          </div>
          {users.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-row-alt"><th className="text-left p-3">ID</th><th className="text-left p-3">Username</th><th className="text-left p-3">Enabled</th><th className="text-left p-3">Privilege</th><th className="text-left p-3">Actions</th></tr></thead>
              <tbody>{users.map((u: any) => (
                <tr key={u.id} className="border-t border-border-card">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3">{u.enabled ? <span className="text-green-healthy">Yes</span> : <span className="text-text-secondary">No</span>}</td>
                  <td className="p-3">{u.privilege}</td>
                  <td className="p-3">
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-critical hover:text-red-700 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-text-secondary text-center py-6">No iDRAC users available</p>}
          <div className="p-4 border-t border-border-card">
            <h3 className="text-xs font-bold uppercase text-text-secondary mb-3">Add New User</h3>
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Username</label>
                <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="px-3 py-1.5 border border-border-card rounded text-sm w-40" placeholder="Username" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Password</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="px-3 py-1.5 border border-border-card rounded text-sm w-40" placeholder="Password" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Role</label>
                <select value={newUser.privilege} onChange={(e) => setNewUser({ ...newUser, privilege: e.target.value })} className="px-3 py-1.5 border border-border-card rounded text-sm">
                  <option>Administrator</option><option>Operator</option><option>ReadOnly</option>
                </select>
              </div>
              <button onClick={handleCreateUser} className="px-4 py-1.5 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Media */}
      {tab === 'vmedia' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Virtual Media</h2></div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border-card rounded p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Disc className="w-4 h-4 text-dell-blue" /> CD/DVD</h3>
                <p className="text-sm text-text-secondary">Status: {vmedia?.cd?.inserted ? <span className="text-green-healthy font-medium">Mounted</span> : 'Not mounted'}</p>
                {vmedia?.cd?.image && <p className="text-xs text-text-secondary mt-1 font-mono truncate">{vmedia.cd.image}</p>}
              </div>
              <div className="border border-border-card rounded p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Disc className="w-4 h-4 text-text-secondary" /> Removable Disk</h3>
                <p className="text-sm text-text-secondary">Status: {vmedia?.removableDisk?.inserted ? <span className="text-green-healthy font-medium">Mounted</span> : 'Not mounted'}</p>
                {vmedia?.removableDisk?.image && <p className="text-xs text-text-secondary mt-1 font-mono truncate">{vmedia.removableDisk.image}</p>}
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">ISO Image URL (CIFS/NFS/HTTP)</label>
                <input value={mountUrl} onChange={(e) => setMountUrl(e.target.value)} placeholder="//server/share/image.iso or http://..." className="w-full px-3 py-2 border border-border-card rounded text-sm" />
              </div>
              <button onClick={handleMount} className="px-4 py-2 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover">Mount</button>
              <button onClick={handleEject} className="px-4 py-2 bg-gray-100 text-text-primary text-sm rounded hover:bg-gray-200">Eject</button>
            </div>
          </div>
        </div>
      )}

      {/* Certificates */}
      {tab === 'certs' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">SSL Certificates</h2></div>
          {certs.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-row-alt"><th className="text-left p-3">Subject</th><th className="text-left p-3">Issuer</th><th className="text-left p-3">Valid From</th><th className="text-left p-3">Valid To</th><th className="text-left p-3">Serial</th></tr></thead>
              <tbody>{certs.map((c: any, i: number) => (
                <tr key={i} className="border-t border-border-card">
                  <td className="p-3">{c.subject}</td>
                  <td className="p-3">{c.issuer}</td>
                  <td className="p-3">{new Date(c.validFrom).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(c.validTo).toLocaleDateString()}</td>
                  <td className="p-3 font-mono text-xs">{c.serialNumber}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-text-secondary text-center py-6">No certificate data available</p>}
        </div>
      )}

      {/* Licenses */}
      {tab === 'licenses' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">iDRAC Licenses</h2></div>
          {licenses.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-row-alt"><th className="text-left p-3">Type</th><th className="text-left p-3">Description</th><th className="text-left p-3">Status</th><th className="text-left p-3">Expiration</th></tr></thead>
              <tbody>{licenses.map((l: any, i: number) => (
                <tr key={i} className="border-t border-border-card">
                  <td className="p-3 font-medium">{l.type}</td>
                  <td className="p-3">{l.description}</td>
                  <td className="p-3"><span className={l.status === 'active' ? 'text-green-healthy' : 'text-red-critical'}>{l.status}</span></td>
                  <td className="p-3">{l.expirationDate ? new Date(l.expirationDate).toLocaleDateString() : 'Perpetual'}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-text-secondary text-center py-6">No license data available</p>}
        </div>
      )}

      {/* Job Queue */}
      {tab === 'jobs' && (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Lifecycle Controller Job Queue</h2>
            <div className="flex gap-2">
              <button onClick={handleClearJobs} className="px-3 py-1 bg-red-50 text-red-critical text-xs rounded hover:bg-red-100 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear All</button>
              <button onClick={fetchData} className="px-3 py-1 bg-gray-100 text-text-primary text-xs rounded hover:bg-gray-200 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
            </div>
          </div>
          {jobs.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-row-alt"><th className="text-left p-3">ID</th><th className="text-left p-3">Name</th><th className="text-left p-3">Status</th><th className="text-left p-3">Progress</th><th className="text-left p-3">Message</th></tr></thead>
              <tbody>{jobs.map((j: any) => (
                <tr key={j.id} className="border-t border-border-card">
                  <td className="p-3 font-mono text-xs">{j.id}</td>
                  <td className="p-3">{j.name}</td>
                  <td className="p-3"><span className={`capitalize ${j.status === 'completed' ? 'text-green-healthy' : j.status === 'failed' ? 'text-red-critical' : j.status === 'running' ? 'text-dell-blue' : 'text-text-secondary'}`}>{j.status}</span></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full"><div className="h-1.5 bg-dell-blue rounded-full" style={{ width: `${j.percentComplete}%` }} /></div>
                      <span className="text-xs">{j.percentComplete}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-text-secondary">{j.message}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-text-secondary text-center py-6">No jobs in queue</p>}
        </div>
      )}

      {/* SCP Export */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Server Configuration Profile</h2></div>
        <div className="p-4 flex items-center gap-4">
          <p className="text-sm text-text-secondary flex-1">Export the full server configuration profile (SCP) for backup or migration.</p>
          <button onClick={() => handleScpExport('json')} className="px-4 py-2 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover flex items-center gap-1.5"><Download className="w-4 h-4" /> Export JSON</button>
          <button onClick={() => handleScpExport('xml')} className="px-4 py-2 bg-gray-100 text-text-primary text-sm rounded hover:bg-gray-200 flex items-center gap-1.5"><Download className="w-4 h-4" /> Export XML</button>
        </div>
      </div>
    </div>
  );
}
