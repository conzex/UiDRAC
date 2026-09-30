/** System info page — CPU, Memory, Network, Power details. */
'use client';
import { useParams } from 'next/navigation';
import { ServerTabPreloader } from '@/components/servers/server-tab-preloader';
import { ServerTabError } from '@/components/servers/server-tab-error';
import { useServerSummary } from '@/lib/use-server-summary';

export default function SystemPage() {
  const { id } = useParams() as { id: string };
  const { data, loading, error, reload } = useServerSummary<{ system: any; network: any }>(
    id ? `/servers/${id}/summary/system` : null,
  );

  if (loading) return <ServerTabPreloader tab="system" />;
  if (error && !data?.system) {
    return (
      <ServerTabError message={error} onRetry={reload} />
    );
  }

  const info = data?.system;
  const network = data?.network;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{error}</div>
      )}
      <div className="bg-white border border-border-card rounded">
        <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
          <h2 className="text-[13px] font-bold uppercase tracking-wide">System Summary</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          {info ? (
            Object.entries({
              Model: info.model,
              Manufacturer: info.manufacturer,
              'Service Tag': info.serviceTag,
              'Host Name': info.hostName,
              'CPU Model': info.cpuModel,
              'CPU Count': info.cpuCount,
              'Total Memory': info.totalMemoryGB ? `${info.totalMemoryGB} GB` : '—',
              'BIOS Version': info.biosVersion,
              'Power State': info.powerState,
            }).map(([k, v]) => (
              <div key={k} className="flex">
                <span className="w-1/2 text-sm text-text-secondary">{k}</span>
                <span className="w-1/2 text-sm font-medium">{String(v || '—')}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary col-span-2 text-center py-4">No system data available</p>
          )}
        </div>
      </div>
      {network?.interfaces?.length > 0 ? (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Network Interfaces</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-row-alt">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">MAC</th>
                <th className="text-left p-3">IP</th>
                <th className="text-left p-3">Speed</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {network.interfaces.map((n: any) => (
                <tr key={n.id} className="border-t border-border-card">
                  <td className="p-3">{n.name}</td>
                  <td className="p-3 font-mono text-xs">{n.macAddress}</td>
                  <td className="p-3">{n.ipAddress || '—'}</td>
                  <td className="p-3">{n.speedMbps ? `${n.speedMbps} Mbps` : '—'}</td>
                  <td className="p-3">
                    <span className={n.linkStatus === 'up' ? 'text-green-healthy' : 'text-text-secondary'}>
                      {n.linkStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide">Network Interfaces</h2>
          </div>
          <p className="text-sm text-text-secondary text-center py-6">No network interfaces reported by iDRAC</p>
        </div>
      )}
    </div>
  );
}
