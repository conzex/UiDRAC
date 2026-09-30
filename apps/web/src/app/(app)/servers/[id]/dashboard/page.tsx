/** Server Dashboard — iDRAC 9 Enterprise replica. */
'use client';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, RefreshCw, Power, Locate, Info, AlertOctagon } from 'lucide-react';
import { ServerTabPreloader } from '@/components/servers/server-tab-preloader';
import { ServerTabError } from '@/components/servers/server-tab-error';
import { useServerSummary } from '@/lib/use-server-summary';
import { useServerSync } from '@/components/servers/server-sync-context';

const healthBanners: Record<string, { bg: string; Icon: any; text: string }> = {
  healthy: { bg: 'bg-green-healthy', Icon: CheckCircle, text: 'SYSTEM IS HEALTHY' },
  warning: { bg: 'bg-amber-warning', Icon: AlertTriangle, text: 'SYSTEM WARNING' },
  critical: { bg: 'bg-red-critical', Icon: XCircle, text: 'SYSTEM CRITICAL' },
  unknown: { bg: 'bg-gray-400', Icon: HelpCircle, text: 'STATUS UNKNOWN' },
};

const sevIcons: Record<string, any> = { informational: Info, warning: AlertTriangle, critical: AlertOctagon };

export default function ServerDashboardPage() {
  const { id } = useParams() as { id: string };
  const { syncFromIdrac, syncing } = useServerSync();
  const { data, loading, error, reload, cachedAt } = useServerSummary<{
    health: any;
    system: any;
    logs: any[];
  }>(id ? `/servers/${id}/summary/dashboard` : null);

  if (loading && !data) return <ServerTabPreloader tab="dashboard" />;

  if (error && !data) {
    return <ServerTabError message={error} onRetry={reload} />;
  }

  const health = data?.health;
  const sysInfo = data?.system;
  const logs = Array.isArray(data?.logs) ? data!.logs.slice(0, 5) : [];
  const banner = healthBanners[health?.overall || 'unknown'];
  const BannerIcon = banner.Icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
        {cachedAt && (
          <span>
            Data synced {new Date(cachedAt).toLocaleString()}
            {(data as { fromCache?: boolean })?.fromCache ? ' (cached)' : ''}
          </span>
        )}
        <button
          type="button"
          disabled={syncing}
          onClick={() => void syncFromIdrac()}
          className="inline-flex items-center gap-1 text-dell-blue hover:underline font-medium disabled:opacity-50 disabled:no-underline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync from iDRAC
        </button>
      </div>

      {(data as { stale?: boolean })?.stale && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Showing last saved data — live iDRAC sync failed. Use Sync from iDRAC when the agent queue is clear.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-3 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
          <button
            onClick={() => void syncFromIdrac()}
            disabled={syncing}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> Retry
          </button>
        </div>
      )}

      <div className={`${banner.bg} text-white p-4 rounded flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <BannerIcon className="w-6 h-6" />
          <span className="text-lg font-bold">{banner.text}</span>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-white/20 rounded text-sm font-medium hover:bg-white/30 flex items-center gap-1.5">
            <Power className="w-3.5 h-3.5" /> Graceful Shutdown
          </button>
          <button className="px-3 py-1.5 bg-white/20 rounded text-sm font-medium hover:bg-white/30 flex items-center gap-1.5">
            <Locate className="w-3.5 h-3.5" /> Identify System
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase text-text-primary tracking-wide">Health Information</h2>
          </div>
          <div className="p-4 space-y-2">
            {(health?.aspects || []).length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No health data available</p>
            ) : (
              (health.aspects || []).map((a: any, i: number) => {
                const dot =
                  a.status === 'healthy'
                    ? 'bg-green-healthy'
                    : a.status === 'warning'
                      ? 'bg-amber-warning'
                      : a.status === 'critical'
                        ? 'bg-red-critical'
                        : 'bg-gray-400';
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-1.5 px-2 rounded ${i % 2 === 1 ? 'bg-row-alt' : ''}`}
                  >
                    <span className="text-sm capitalize">{a.aspect.replace('-', ' ')} Health</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                      <span className="text-sm capitalize">{a.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase text-text-primary tracking-wide">System Information</h2>
          </div>
          <div className="p-4">
            {sysInfo ? (
              [
                ['Power State', sysInfo.powerState === 'on' ? 'Powered On' : 'Powered Off'],
                ['Model', sysInfo.model || '—'],
                ['Host Name', sysInfo.hostName || '—'],
                ['OS Name', sysInfo.osName || '—'],
                ['OS Version', sysInfo.osVersion || '—'],
                ['Service Tag', sysInfo.serviceTag || '—'],
                ['BIOS Version', sysInfo.biosVersion || '—'],
                ['iDRAC Firmware', sysInfo.idracFirmware || '—'],
                ['iDRAC MAC Address', sysInfo.idracMac || '—'],
              ].map(([label, value], i) => (
                <div key={label} className={`flex py-1.5 px-2 rounded ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                  <span className="w-[40%] text-sm text-text-secondary">{label}</span>
                  <span className="w-[60%] text-sm text-text-primary font-medium">{value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary text-center py-4">No system information available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase text-text-primary tracking-wide">Recent Logs</h2>
            <a href={`/servers/${id}/maintenance`} className="text-xs text-dell-blue hover:underline">View All</a>
          </div>
          <div className="divide-y divide-border-card">
            {logs.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary text-center">No recent logs</div>
            ) : (
              logs.map((log: any, i: number) => {
                const SevIcon = sevIcons[log.severity] || Info;
                const sevColor =
                  log.severity === 'critical' ? 'text-red-critical' : log.severity === 'warning' ? 'text-amber-warning' : 'text-dell-blue';
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                    <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sevColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{log.message}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase text-text-primary tracking-wide">Virtual Console</h2>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-gray-900 rounded mb-3 flex items-center justify-center text-white/50 text-sm">
                Console Preview
              </div>
              <a
                href={`/servers/${id}/console`}
                className="inline-block px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover"
              >
                Launch Console
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
