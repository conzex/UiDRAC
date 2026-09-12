/** Servers list page */
'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/app-shell';
import api from '@/lib/api';

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  useEffect(() => { api.get('/servers').then((r) => setServers(r.data?.data || [])).catch(() => {}); }, []);
  const hc: Record<string, string> = { HEALTHY: 'text-green-healthy', WARNING: 'text-amber-warning', CRITICAL: 'text-red-critical' };
  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4"><h1 className="text-2xl font-bold">Servers</h1><a href="/servers/new" className="px-4 py-2 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover">+ Add Server</a></div>
      <div className="bg-white border border-border-card rounded">
        <table className="w-full text-sm">
          <thead><tr className="bg-row-alt border-b border-border-card"><th className="text-left p-3">Name</th><th className="text-left p-3">IP</th><th className="text-left p-3">Generation</th><th className="text-left p-3">Health</th><th className="text-left p-3">Model</th><th className="text-left p-3">Service Tag</th></tr></thead>
          <tbody>{servers.map((s) => <tr key={s.id} className="border-t border-border-card hover:bg-row-hover cursor-pointer" onClick={() => window.location.href = `/servers/${s.id}/dashboard`}><td className="p-3 font-medium text-dell-blue">{s.name}</td><td className="p-3 font-mono text-xs">{s.ip}</td><td className="p-3">{s.generation?.replace('GEN', 'iDRAC ')}</td><td className={`p-3 capitalize ${hc[s.health] || ''}`}>{s.health?.toLowerCase()}</td><td className="p-3">{s.model || '—'}</td><td className="p-3">{s.serviceTag || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </AppShell>
  );
}
