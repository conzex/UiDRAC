/** Servers list page with edit/delete functionality. */
'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Save, AlertTriangle, Search } from 'lucide-react';
import api from '@/lib/api';
import { readStoredUser } from '@/lib/auth-client';
import { canDeleteServers, canMutateServers } from '@/lib/rbac';
import { FleetAgentHeader } from '@/components/agent/fleet-agent-header';
import AppPageHeader from '@/components/layout/app-page-header';
import { useAddServerModal } from '@/components/servers/add-server-modal-context';

export default function ServersPage() {
  const { openAddServer } = useAddServerModal();
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [fetchError, setFetchError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const fetchServers = () => {
    setLoading(true);
    setFetchError('');
    api
      .get('/servers')
      .then((r) => {
        setServers(r.data?.data || []);
        setLoading(false);
      })
      .catch(() => {
        setServers([]);
        setFetchError('Could not load servers. Check your connection or try again.');
        setLoading(false);
      });
  };

  useEffect(() => { fetchServers(); }, []);

  // Auto-dismiss action messages after 3 seconds
  useEffect(() => {
    if (actionMsg) { const t = setTimeout(() => setActionMsg(''), 3000); return () => clearTimeout(t); }
  }, [actionMsg]);

  // ESC and click-outside for modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDeleteId(null); setEditId(null); } };
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) { setDeleteId(null); setEditId(null); }
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleEsc); document.removeEventListener('mousedown', handleClick); };
  }, []);

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await api.patch(`/servers/${editId}`, { name: editName, tags: editTags.split(',').map((t) => t.trim()).filter(Boolean) });
      setActionMsg('Server updated successfully.');
      setEditId(null);
      fetchServers();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to update server.'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/servers/${deleteId}`);
      setActionMsg('Server deleted successfully.');
      setDeleteId(null);
      fetchServers();
    } catch (err: any) { setActionMsg(err?.response?.data?.message || 'Failed to delete server.'); }
  };

  const startEdit = (server: any) => {
    setEditId(server.id);
    setEditName(server.name);
    setEditTags(server.tags?.join(', ') || '');
  };

  const hc: Record<string, string> = { HEALTHY: 'text-green-healthy', WARNING: 'text-amber-warning', CRITICAL: 'text-red-critical' };
  const filtered = servers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.ip.includes(search));
  const canEdit = canMutateServers(readStoredUser()?.role);
  const canDelete = canDeleteServers(readStoredUser()?.role);

  return (
    <>
      {canEdit ? (
        <FleetAgentHeader title="Servers" description="Manage iDRAC endpoints in your organization." className="mb-4" />
      ) : (
        <AppPageHeader title="Servers" description="View servers in your organization." className="mb-4" />
      )}

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-dell-blue text-sm p-3 rounded mb-4 flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-dell-blue/60 hover:text-dell-blue"><X className="w-4 h-4" /></button>
        </div>
      )}

      {servers.length > 0 && (
        <div className="mb-4 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or IP..." className="w-full pl-9 pr-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" />
        </div>
      )}

      {fetchError && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button type="button" onClick={fetchServers} className="text-dell-blue font-semibold hover:underline shrink-0">
            Retry
          </button>
        </div>
      )}

      <div className="bg-white border border-border-card rounded">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading servers...</div>
        ) : fetchError ? (
          <div className="p-12 text-center text-text-secondary">Server list unavailable.</div>
        ) : servers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-secondary mb-4">No servers added yet.</p>
            {canEdit && (
              <button
                type="button"
                onClick={openAddServer}
                className="px-4 py-2 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Your First Server
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-row-alt border-b border-border-card">
              <th className="text-left p-3">Name</th><th className="text-left p-3">IP</th><th className="text-left p-3">Generation</th>
              <th className="text-left p-3">Health</th><th className="text-left p-3">Model</th><th className="text-left p-3">Service Tag</th>
              <th className="text-left p-3 w-24">Actions</th>
            </tr></thead>
            <tbody>{filtered.map((s) => (
              <tr key={s.id} className="border-t border-border-card hover:bg-row-hover">
                <td className="p-3"><a href={`/servers/${s.id}/dashboard`} className="font-medium text-dell-blue hover:underline">{s.name}</a></td>
                <td className="p-3 font-mono text-xs">{s.ip}</td>
                <td className="p-3">{s.generation?.replace('GEN', 'iDRAC ')}</td>
                <td className={`p-3 capitalize ${hc[s.health] || ''}`}>{s.health?.toLowerCase()}</td>
                <td className="p-3">{s.model || '—'}</td>
                <td className="p-3">{s.serviceTag || '—'}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {canEdit && (
                      <button onClick={() => startEdit(s)} className="p-1 text-text-secondary hover:text-dell-blue" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    )}
                    {canDelete && (
                      <button onClick={() => { setDeleteId(s.id); setDeleteName(s.name); }} className="p-1 text-text-secondary hover:text-red-critical" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Edit Server</h2>
              <button onClick={() => setEditId(null)} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Server Name</label><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" /></div>
              <div><label className="block text-sm font-medium mb-1">Tags (comma-separated)</label><input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="production, rack-a, us-east" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" /></div>
              <div className="flex gap-3">
                <button onClick={handleEdit} className="flex-1 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover flex items-center justify-center gap-1.5"><Save className="w-4 h-4" /> Save</button>
                <button onClick={() => setEditId(null)} className="flex-1 py-2 bg-gray-100 text-text-primary text-sm font-semibold rounded hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-critical" /></div>
              <div><h2 className="text-lg font-bold">Delete Server</h2><p className="text-sm text-text-secondary">This action cannot be undone.</p></div>
            </div>
            <p className="text-sm mb-5">Are you sure you want to delete <strong>{deleteName}</strong>? All associated data including console sessions and audit logs will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 flex items-center justify-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 bg-gray-100 text-text-primary text-sm font-semibold rounded hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
