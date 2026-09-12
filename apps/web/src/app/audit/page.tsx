/** Audit log page */
'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/app-shell';
import api from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { api.get('/audit').then((r) => setLogs(r.data?.data || [])).catch(() => {}); }, []);
  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>
      <div className="bg-white border border-border-card rounded">
        <table className="w-full text-sm">
          <thead><tr className="bg-row-alt border-b border-border-card"><th className="text-left p-3">Action</th><th className="text-left p-3">User</th><th className="text-left p-3">Server</th><th className="text-left p-3">IP</th><th className="text-left p-3">Timestamp</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id} className="border-t border-border-card"><td className="p-3 font-mono text-xs">{l.action}</td><td className="p-3">{l.user?.email || '—'}</td><td className="p-3">{l.server?.name || '—'}</td><td className="p-3 font-mono text-xs">{l.ip}</td><td className="p-3 text-text-secondary">{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table>
        {logs.length === 0 && <div className="p-8 text-center text-text-secondary">No audit logs found</div>}
      </div>
    </AppShell>
  );
}
