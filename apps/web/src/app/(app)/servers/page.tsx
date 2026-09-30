/** Servers list — fleet table with search aligned to Dashboard. */
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Trash2, X, Save, AlertTriangle, RefreshCw, ServerCrash } from 'lucide-react';
import api from '@/lib/api';
import { readStoredUser } from '@/lib/auth-client';
import { canDeleteServers, canMutateServers } from '@/lib/rbac';
import { FleetAgentHeader } from '@/components/agent/fleet-agent-header';
import AppPageHeader from '@/components/layout/app-page-header';
import { useAddServerModal } from '@/components/servers/add-server-modal-context';
import { ServerSearchInput } from '@/components/servers/server-search-input';
import { ServerSearchEmpty } from '@/components/servers/server-search-empty';

const healthClass: Record<string, string> = {
  HEALTHY: 'text-green-healthy',
  WARNING: 'text-amber-warning',
  CRITICAL: 'text-red-critical',
};

function ServersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      openAddServer();
      router.replace('/servers', { scroll: false });
    }
  }, [searchParams, openAddServer, router]);

  useEffect(() => {
    if (actionMsg) {
      const t = setTimeout(() => setActionMsg(''), 3000);
      return () => clearTimeout(t);
    }
  }, [actionMsg]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteId(null);
        setEditId(null);
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setDeleteId(null);
        setEditId(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await api.patch(`/servers/${editId}`, {
        name: editName,
        tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setActionMsg('Server updated successfully.');
      setEditId(null);
      fetchServers();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Failed to update server.');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/servers/${deleteId}`);
      setActionMsg('Server deleted successfully.');
      setDeleteId(null);
      fetchServers();
    } catch (err: any) {
      setActionMsg(err?.response?.data?.message || 'Failed to delete server.');
    }
  };

  const startEdit = (server: any) => {
    setEditId(server.id);
    setEditName(server.name);
    setEditTags(server.tags?.join(', ') || '');
  };

  const filtered = servers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      String(s.ip).includes(search) ||
      (s.serviceTag && String(s.serviceTag).toLowerCase().includes(search.toLowerCase())),
  );

  const stats = {
    total: servers.length,
    healthy: servers.filter((s) => s.health === 'HEALTHY').length,
    warning: servers.filter((s) => s.health === 'WARNING').length,
    critical: servers.filter((s) => s.health === 'CRITICAL').length,
  };

  const canEdit = canMutateServers(readStoredUser()?.role);
  const canDelete = canDeleteServers(readStoredUser()?.role);
  const fleetDescription =
    'Manage iDRAC endpoints in your organization — search, edit tags, and open any server dashboard.';

  return (
    <>
      {canEdit ? (
        <FleetAgentHeader title="Servers" description={fleetDescription} className="mb-6" />
      ) : (
        <AppPageHeader title="Servers" description={fleetDescription} className="mb-6" />
      )}

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-dell-blue text-sm p-3 rounded mb-4 flex items-center justify-between">
          <span>{actionMsg}</span>
          <button type="button" onClick={() => setActionMsg('')} className="text-dell-blue/60 hover:text-dell-blue">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-4 rounded mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {fetchError}
          </div>
          <button
            type="button"
            onClick={fetchServers}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {!fetchError && !loading && servers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Servers', value: stats.total, color: 'text-dell-blue' },
            { label: 'Healthy', value: stats.healthy, color: 'text-green-healthy' },
            { label: 'Warning', value: stats.warning, color: 'text-amber-warning' },
            { label: 'Critical', value: stats.critical, color: 'text-red-critical' },
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded border border-border-card">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-text-secondary mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {servers.length > 0 && <ServerSearchInput value={search} onChange={setSearch} />}

      <div className="bg-white border border-border-card rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border-card">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 animate-pulse flex gap-4">
                <div className="h-4 bg-gray-200 rounded flex-1 max-w-[140px]" />
                <div className="h-4 bg-gray-200 rounded flex-1 max-w-[100px]" />
                <div className="h-4 bg-gray-200 rounded flex-1 max-w-[80px]" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="p-12 text-center text-text-secondary">Server list unavailable.</div>
        ) : servers.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dell-blue/10 mb-4">
              <ServerCrash className="w-8 h-8 text-dell-blue" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No servers yet</h2>
            <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
              Add your first server after your UiDRAC Agent is connected.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openAddServer}
                className="inline-flex px-5 py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Your First Server
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <ServerSearchEmpty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-row-alt border-b border-border-card">
                  <th className="text-left p-3 font-semibold text-text-primary">Name</th>
                  <th className="text-left p-3 font-semibold text-text-primary">IP</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Generation</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Health</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Model</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Service Tag</th>
                  <th className="text-left p-3 font-semibold text-text-primary">Tags</th>
                  {(canEdit || canDelete) && (
                    <th className="text-left p-3 font-semibold text-text-primary w-24">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border-card hover:bg-row-hover">
                    <td className="p-3">
                      <a href={`/servers/${s.id}/dashboard`} className="font-medium text-dell-blue hover:underline">
                        {s.name}
                      </a>
                    </td>
                    <td className="p-3 font-mono text-xs">{s.ip}</td>
                    <td className="p-3">{s.generation?.replace('GEN', 'iDRAC ') ?? '—'}</td>
                    <td className={`p-3 capitalize ${healthClass[s.health] || 'text-text-secondary'}`}>
                      {s.health?.toLowerCase() ?? 'unknown'}
                    </td>
                    <td className="p-3">{s.model || '—'}</td>
                    <td className="p-3 font-mono text-xs">{s.serviceTag || '—'}</td>
                    <td className="p-3">
                      {s.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {s.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-bg-body text-text-secondary px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => startEdit(s)}
                              className="p-1 text-text-secondary hover:text-dell-blue"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteId(s.id);
                                setDeleteName(s.name);
                              }}
                              className="p-1 text-text-secondary hover:text-red-critical"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Edit Server</h2>
              <button type="button" onClick={() => setEditId(null)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Server Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="production, rack-a, us-east"
                  className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex-1 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="flex-1 py-2 bg-gray-100 text-text-primary text-sm font-semibold rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-critical" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Delete Server</h2>
                <p className="text-sm text-text-secondary">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm mb-5">
              Are you sure you want to delete <strong>{deleteName}</strong>? All associated data including console
              sessions and audit logs will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 bg-gray-100 text-text-primary text-sm font-semibold rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ServersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-secondary p-6">Loading servers…</p>}>
      <ServersPageContent />
    </Suspense>
  );
}
