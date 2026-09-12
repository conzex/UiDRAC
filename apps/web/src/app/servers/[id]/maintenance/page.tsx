/** Maintenance page — Firmware, Logs, Power Control. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function MaintenancePage() {
  const { id } = useParams() as { id: string };
  const [firmware, setFirmware] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [powerMsg, setPowerMsg] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/servers/${id}/firmware`).then((r) => setFirmware(r.data)).catch(() => {}),
      api.get(`/servers/${id}/logs`).then((r) => setLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
      api.get(`/servers/${id}/sensors`).then((r) => setSensors(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
    ]).catch((err) => {
      setError(err?.response?.data?.message || 'Unable to load maintenance data from iDRAC.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handlePower = async (action: string) => {
    setPowerMsg('');
    try {
      await api.post(`/servers/${id}/power`, { action });
      setPowerMsg(`Power action "${action}" sent successfully.`);
    } catch (err: any) {
      setPowerMsg(err?.response?.data?.message || `Failed to send power action "${action}".`);
    }
  };

  const sevIcons: Record<string, string> = { informational: '🔵', warning: '🟡', critical: '🔴' };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-48 bg-gray-200 rounded" /><div className="h-48 bg-gray-200 rounded" /><div className="h-48 bg-gray-200 rounded" /></div>;

  if (error && !firmware && logs.length === 0 && sensors.length === 0) return (
    <div className="bg-red-50 border border-red-200 rounded p-8 text-center">
      <div className="text-red-critical text-4xl mb-3">⚠</div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">Unable to Load Maintenance Data</h2>
      <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">{error}</p>
      <button onClick={fetchData} className="px-5 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Firmware */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Firmware Inventory</h2></div>
        {firmware?.components?.length > 0 ? (
          <table className="w-full text-sm"><thead><tr className="bg-row-alt"><th className="text-left p-3">Component</th><th className="text-left p-3">Version</th><th className="text-left p-3">Updateable</th></tr></thead>
            <tbody>{firmware.components.map((c: any, i: number) => <tr key={i} className="border-t border-border-card"><td className="p-3">{c.name}</td><td className="p-3 font-mono text-xs">{c.version}</td><td className="p-3">{c.updateable ? '✅' : '—'}</td></tr>)}</tbody></table>
        ) : <p className="text-sm text-text-secondary text-center py-6">No firmware inventory available</p>}
      </div>

      {/* Sensors */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Sensor Readings</h2></div>
        {sensors.length > 0 ? (
          <table className="w-full text-sm"><thead><tr className="bg-row-alt"><th className="text-left p-3">Sensor</th><th className="text-left p-3">Value</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>{sensors.map((s: any, i: number) => <tr key={i} className="border-t border-border-card"><td className="p-3">{s.name}</td><td className="p-3 font-mono">{s.value} {s.unit}</td><td className="p-3 text-green-healthy capitalize">{s.status}</td></tr>)}</tbody></table>
        ) : <p className="text-sm text-text-secondary text-center py-6">No sensor data available</p>}
      </div>

      {/* Logs */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">System Event Log</h2></div>
        {logs.length > 0 ? (
          <div className="divide-y divide-border-card">{logs.map((l: any, i: number) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5"><span>{sevIcons[l.severity] || '🔵'}</span><div className="flex-1"><p className="text-sm">{l.message}</p><p className="text-xs text-text-secondary">{new Date(l.timestamp).toLocaleString()}</p></div></div>
          ))}</div>
        ) : <p className="text-sm text-text-secondary text-center py-6">No system event log entries</p>}
      </div>

      {/* Power Control */}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Power Control</h2></div>
        <div className="p-4">
          <div className="flex gap-3 flex-wrap">{['on', 'graceful-shutdown', 'reset', 'cycle'].map((action) => (
            <button key={action} onClick={() => handlePower(action)} className="px-4 py-2 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover capitalize">{action.replace('-', ' ')}</button>
          ))}</div>
          {powerMsg && <p className="text-sm mt-3 text-text-secondary">{powerMsg}</p>}
        </div>
      </div>
    </div>
  );
}
