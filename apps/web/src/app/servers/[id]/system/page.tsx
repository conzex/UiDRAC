/** System info page — CPU, Memory, Network, Power details. */
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function SystemPage() {
  const { id } = useParams() as { id: string };
  const [info, setInfo] = useState<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      api.get(`/servers/${id}/system`),
      api.get(`/servers/${id}/network`),
    ]);
    if (results[0].status === 'fulfilled') setInfo(results[0].value.data);
    else if (!info) setError(results[0].reason?.response?.data?.message || 'Unable to reach iDRAC. Check network connectivity.');
    if (results[1].status === 'fulfilled') setNetwork(results[1].value.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-64 bg-gray-200 rounded" /><div className="h-48 bg-gray-200 rounded" /></div>;

  if (error && !info) return (
    <div className="bg-red-50 border border-red-200 rounded p-8 text-center">
      <AlertTriangle className="w-10 h-10 text-red-critical mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-text-primary mb-2">Unable to Load System Information</h2>
      <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">{error}</p>
      <button onClick={fetchData} className="px-5 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">System Summary</h2></div>
        <div className="p-4 grid grid-cols-2 gap-4">
          {info ? Object.entries({ Model: info.model, Manufacturer: info.manufacturer, 'Service Tag': info.serviceTag, 'Host Name': info.hostName, 'CPU Model': info.cpuModel, 'CPU Count': info.cpuCount, 'Total Memory': info.totalMemoryGB ? `${info.totalMemoryGB} GB` : '—', 'BIOS Version': info.biosVersion, 'Power State': info.powerState }).map(([k, v]) => (
            <div key={k} className="flex"><span className="w-1/2 text-sm text-text-secondary">{k}</span><span className="w-1/2 text-sm font-medium">{String(v || '—')}</span></div>
          )) : (
            <p className="text-sm text-text-secondary col-span-2 text-center py-4">No system data available</p>
          )}
        </div>
      </div>
      {network?.interfaces?.length > 0 ? (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Network Interfaces</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-row-alt"><th className="text-left p-3">Name</th><th className="text-left p-3">MAC</th><th className="text-left p-3">IP</th><th className="text-left p-3">Speed</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>{network.interfaces.map((n: any) => <tr key={n.id} className="border-t border-border-card"><td className="p-3">{n.name}</td><td className="p-3 font-mono text-xs">{n.macAddress}</td><td className="p-3">{n.ipAddress || '—'}</td><td className="p-3">{n.speedMbps ? `${n.speedMbps} Mbps` : '—'}</td><td className="p-3"><span className={n.linkStatus === 'up' ? 'text-green-healthy' : 'text-text-secondary'}>{n.linkStatus}</span></td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card"><h2 className="text-[13px] font-bold uppercase tracking-wide">Network Interfaces</h2></div>
          <p className="text-sm text-text-secondary text-center py-6">No network interfaces reported by iDRAC</p>
        </div>
      )}
    </div>
  );
}
