/** Audit log page */
'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import AppPageHeader from '@/components/layout/app-page-header';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  useEffect(() => {
    setLoading(true);
    setFetchError('');
    api
      .get('/audit')
      .then((r) => setLogs(r.data?.data || []))
      .catch(() => setFetchError('Could not load audit logs. Check your connection or permissions.'))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <AppPageHeader title="Audit log" description="Immutable record of sign-in, server, and administrative actions." />
      {fetchError && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">{fetchError}</div>
      )}
      <div className="bg-white border border-border-card rounded">
        <table className="w-full text-sm">
          <thead><tr className="bg-row-alt border-b border-border-card"><th className="text-left p-3">Action</th><th className="text-left p-3">User</th><th className="text-left p-3">Server</th><th className="text-left p-3">IP</th><th className="text-left p-3">Timestamp</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id} className="border-t border-border-card"><td className="p-3 font-mono text-xs">{l.action}</td><td className="p-3">{l.user?.email || '—'}</td><td className="p-3">{l.server?.name || '—'}</td><td className="p-3 font-mono text-xs">{l.ip}</td><td className="p-3 text-text-secondary">{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table>
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading audit logs…</div>
        ) : logs.length === 0 && !fetchError ? (
          <div className="p-8 text-center text-text-secondary">No audit logs found</div>
        ) : null}
      </div>
    </>
  );
}
