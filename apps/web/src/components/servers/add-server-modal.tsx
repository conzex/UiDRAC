'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppModal from '@/components/ui/app-modal';
import api from '@/lib/api';
import { useAddServerModal } from './add-server-modal-context';

export function AddServerModal() {
  const router = useRouter();
  const { open, closeAddServer } = useAddServerModal();
  const [step, setStep] = useState(1);
  const [ip, setIp] = useState('');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [probe, setProbe] = useState<any>(null);
  const [credMode, setCredMode] = useState('session');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep(1);
    setIp('');
    setUsername('root');
    setPassword('');
    setName('');
    setProbe(null);
    setCredMode('session');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    closeAddServer();
    reset();
  };

  const doProbe = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/servers/probe', { ip, username, password });
      setProbe(data);
      setName(data.model ? `${data.model}-${ip.split('.').pop()}` : `Server-${ip}`);
      setStep(2);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Probe failed');
    } finally {
      setLoading(false);
    }
  };

  const doCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/servers', { name, ip, username, password, credentialsMode: credMode });
      handleClose();
      router.push(`/servers/${data.id}/dashboard`);
      router.refresh();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to add server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Add server"
      subtitle={step === 1 ? 'Step 1 — Enter iDRAC credentials' : 'Step 2 — Confirm detected system'}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded mb-4">{error}</div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">iDRAC IP / Hostname</label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full px-3 py-2 border border-border-card rounded text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-border-card rounded text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border-card rounded text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-dell-blue"
            />
          </div>
          <button
            type="button"
            onClick={doProbe}
            disabled={loading || !ip}
            className="w-full py-2.5 bg-dell-blue text-white rounded font-semibold text-sm hover:bg-dell-blue-hover disabled:opacity-50"
          >
            {loading ? 'Probing…' : 'Probe server'}
          </button>
        </div>
      )}
      {step === 2 && probe && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-healthy p-3 rounded text-sm">
            Server detected successfully
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Generation', `iDRAC ${probe.generation}`],
              ['Model', probe.model],
              ['Service Tag', probe.serviceTag],
              ['Health', probe.health],
            ].map(([k, v]) => (
              <div key={k} className="flex">
                <span className="w-1/3 text-text-secondary">{k}</span>
                <span className="w-2/3 font-medium">{v || '—'}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Server name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border-card rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Credential storage</label>
            <select
              value={credMode}
              onChange={(e) => setCredMode(e.target.value)}
              className="w-full px-3 py-2 border border-border-card rounded text-sm"
            >
              <option value="session">Session only (30 min TTL)</option>
              <option value="saved">Save encrypted</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-border-card rounded text-sm font-semibold hover:bg-row-hover"
            >
              Back
            </button>
            <button
              type="button"
              onClick={doCreate}
              disabled={loading}
              className="flex-1 py-2.5 bg-dell-blue text-white rounded font-semibold text-sm hover:bg-dell-blue-hover disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add server'}
            </button>
          </div>
        </div>
      )}
    </AppModal>
  );
}
