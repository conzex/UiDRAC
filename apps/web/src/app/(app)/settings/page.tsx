/** Settings page */
'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function SettingsPage() {
  const [tenant, setTenant] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    api.get('/tenant').then((r) => setTenant(r.data)).catch(() => {});
    api.get('/tenant/users').then((r) => setUsers(r.data || [])).catch(() => {});
  }, []);
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        <div className="bg-white border border-border-card rounded p-6">
          <h2 className="font-semibold mb-3">Organization</h2>
          <p className="text-sm text-text-secondary">Name: {tenant?.name || 'Loading...'}</p>
          <p className="text-sm text-text-secondary">Plan: {tenant?.plan || '—'}</p>
        </div>
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Users</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-row-alt"><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Last Login</th></tr></thead>
            <tbody>{users.map((u) => <tr key={u.id} className="border-t border-border-card"><td className="p-3">{u.email}</td><td className="p-3 capitalize">{u.role?.toLowerCase()}</td><td className="p-3 text-text-secondary">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
