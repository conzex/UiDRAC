/** Dashboard — Fleet overview with server cards grid. */
'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/app-shell';
import api from '@/lib/api';

const healthColors: Record<string, string> = { HEALTHY: 'bg-green-healthy', WARNING: 'bg-amber-warning', CRITICAL: 'bg-red-critical', UNKNOWN: 'bg-gray-400' };
const genColors: Record<string, string> = { GEN6: 'bg-gray-500', GEN7: 'bg-amber-warning', GEN8: 'bg-blue-500', GEN9: 'bg-dell-blue' };

export default function DashboardPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchServers = () => {
    setLoading(true);
    setError('');
    api.get('/servers')
      .then((r) => { setServers(r.data.data || []); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.message || 'Failed to load servers. Check your connection.'); setLoading(false); });
  };

  useEffect(() => { fetchServers(); }, []);

  const filtered = servers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.ip.includes(search));
  const stats = { total: servers.length, healthy: servers.filter((s) => s.health === 'HEALTHY').length, warning: servers.filter((s) => s.health === 'WARNING').length, critical: servers.filter((s) => s.health === 'CRITICAL').length };

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Server Fleet</h1>
        <a href="/servers/new" className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors">+ Add Server</a>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-4 rounded mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchServers} className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium transition-colors">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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

      {/* Search */}
      {servers.length > 0 && (
        <div className="mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search servers..."
            className="w-full max-w-md px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue" />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded border border-border-card p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-2/3 mb-3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>)}
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded border border-border-card">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dell-blue/10 mb-4">
            <svg className="w-8 h-8 text-dell-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5v14" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No servers yet</h2>
          <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            Get started by adding your first Dell PowerEdge server. You'll need the iDRAC IP address and credentials.
          </p>
          <a href="/servers/new" className="inline-flex px-5 py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors">
            Add Your First Server
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-lg mb-2">No servers match your search</p>
          <p className="text-sm">Try adjusting your search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((server) => (
            <a key={server.id} href={`/servers/${server.id}/dashboard`} className="bg-white rounded border border-border-card hover:border-dell-blue hover:shadow-md transition-all p-5 block group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-text-primary group-hover:text-dell-blue">{server.name}</h3>
                  <p className="text-sm text-text-secondary mt-0.5">{server.ip}</p>
                </div>
                <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${genColors[server.generation] || 'bg-gray-400'}`}>
                  {server.generation?.replace('GEN', 'iDRAC ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${healthColors[server.health] || 'bg-gray-400'}`} />
                  <span className="text-xs text-text-secondary">{server.health?.toLowerCase()}</span>
                </div>
                <span className="text-xs text-text-secondary">{server.model || 'PowerEdge'}</span>
              </div>
              {server.tags?.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {server.tags.map((tag: string) => <span key={tag} className="text-[10px] bg-bg-body text-text-secondary px-1.5 py-0.5 rounded">{tag}</span>)}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </AppShell>
  );
}
