/** Add server wizard */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { readStoredUser } from '@/lib/auth-client';
import { canMutateServers } from '@/lib/rbac';

export default function AddServerPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [ip, setIp] = useState('');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('calvin');
  const [name, setName] = useState('');
  const [probe, setProbe] = useState<any>(null);
  const [credMode, setCredMode] = useState('session');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canMutateServers(readStoredUser()?.role)) router.replace('/servers');
  }, [router]);

  const doProbe = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/servers/probe', { ip, username, password });
      setProbe(data);
      setName(data.model ? `${data.model}-${ip.split('.').pop()}` : `Server-${ip}`);
      setStep(2);
    } catch (e: any) { setError(e.response?.data?.message || 'Probe failed'); } finally { setLoading(false); }
  };

  const doCreate = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/servers', { name, ip, username, password, credentialsMode: credMode });
      router.push(`/servers/${data.id}/dashboard`);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to add server'); } finally { setLoading(false); }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Add Server</h1>
      <div className="max-w-lg mx-auto bg-white border border-border-card rounded p-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded mb-4">{error}</div>}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Step 1: Enter iDRAC Credentials</h2>
            <div><label className="block text-sm font-medium mb-1">iDRAC IP / Hostname</label><input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.100" className="w-full px-3 py-2 border border-border-card rounded text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm" /></div>
            <button onClick={doProbe} disabled={loading || !ip} className="w-full py-2.5 bg-dell-blue text-white rounded font-semibold hover:bg-dell-blue-hover disabled:opacity-50">{loading ? 'Probing...' : 'Probe Server'}</button>
          </div>
        )}
        {step === 2 && probe && (
          <div className="space-y-4">
            <h2 className="font-semibold">Step 2: Server Detected</h2>
            <div className="bg-green-50 border border-green-200 text-green-healthy p-3 rounded text-sm">✓ Server detected successfully</div>
            <div className="space-y-2 text-sm">{[['Generation', `iDRAC ${probe.generation}`], ['Model', probe.model], ['Service Tag', probe.serviceTag], ['Health', probe.health]].map(([k, v]) => <div key={k} className="flex"><span className="w-1/3 text-text-secondary">{k}</span><span className="w-2/3 font-medium">{v || '—'}</span></div>)}</div>
            <div><label className="block text-sm font-medium mb-1">Server Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Credential Storage</label>
              <select value={credMode} onChange={(e) => setCredMode(e.target.value)} className="w-full px-3 py-2 border border-border-card rounded text-sm"><option value="session">Session Only (30 min TTL)</option><option value="saved">Save Encrypted</option></select></div>
            <button onClick={doCreate} disabled={loading} className="w-full py-2.5 bg-dell-blue text-white rounded font-semibold hover:bg-dell-blue-hover disabled:opacity-50">{loading ? 'Adding...' : 'Add Server'}</button>
          </div>
        )}
      </div>
    </>
  );
}
