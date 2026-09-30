/** Operations dashboard — agents, reach time, fleet health (no server grid). */
'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Server, Radio, Activity } from 'lucide-react';
import { FleetAgentHeader } from '@/components/agent/fleet-agent-header';
import AppPageHeader from '@/components/layout/app-page-header';
import { readStoredUser } from '@/lib/auth-client';
import { canMutateServers } from '@/lib/rbac';
import { useFleetMetrics } from '@/lib/use-fleet-metrics';
import {
  ChartCard,
  HorizontalBarChart,
  LineReachChart,
  PieChartWithLegend,
  topModelSlices,
} from '@/components/dashboard/chart-primitives';
import AppPreloader from '@/components/layout/app-preloader';
import { APP_VERSION_LABEL, PRODUCT_NAME } from '@idrac/shared';

const AGENT_GROUP_COLORS: Record<string, string> = {
  Connected: '#22C55E',
  Pending: '#F59E0B',
  Stopped: '#64748B',
  Blocked: '#EF4444',
};

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: '#22C55E',
  WARNING: '#F59E0B',
  CRITICAL: '#EF4444',
  UNKNOWN: '#94A3B8',
};

function agentBarItems(byStatus: Record<string, number>) {
  const pending =
    (byStatus.connecting ?? 0) +
    (byStatus.updating ?? 0) +
    (byStatus.never_connected ?? 0);
  const stopped =
    (byStatus.disconnected ?? 0) + (byStatus.offline ?? 0) + (byStatus.error ?? 0);
  const blocked = (byStatus.disabled ?? 0) + (byStatus.revoked ?? 0);
  return [
    { label: 'Connected (running)', value: byStatus.connected ?? 0, color: AGENT_GROUP_COLORS.Connected },
    { label: 'Pending / starting', value: pending, color: AGENT_GROUP_COLORS.Pending },
    { label: 'Stopped / offline', value: stopped, color: AGENT_GROUP_COLORS.Stopped },
    { label: 'Disabled / revoked', value: blocked, color: AGENT_GROUP_COLORS.Blocked },
  ];
}

export default function DashboardPage() {
  const canManage = canMutateServers(readStoredUser()?.role);
  const { metrics, history, error, loading, refresh } = useFleetMetrics(8_000);

  const headerDescription = `Live fleet operations — agent connectors, API reach time, and server health. ${PRODUCT_NAME} ${APP_VERSION_LABEL}`;

  return (
    <>
      {canManage ? (
        <FleetAgentHeader
          title="Operations Center"
          description={headerDescription}
          className="mb-6"
          showBulkImport={false}
          addServerOnServersPage
        />
      ) : (
        <AppPageHeader title="Operations Center" description={headerDescription} className="mb-6" />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-critical text-sm p-4 rounded mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {loading && !metrics ? (
        <div className="py-16 flex justify-center">
          <AppPreloader fullScreen={false} label="Loading fleet metrics…" />
        </div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: 'UiDRAC agents',
                value: metrics.agents.total,
                sub: `${metrics.agents.byStatus.connected ?? 0} connected`,
                icon: Radio,
                color: 'text-dell-blue',
              },
              {
                label: 'Registered servers',
                value: metrics.servers.total,
                sub: 'Manage in Servers tab',
                icon: Server,
                color: 'text-text-primary',
              },
              {
                label: 'Healthy servers',
                value: metrics.servers.byHealth.HEALTHY ?? 0,
                sub: `${metrics.servers.byHealth.CRITICAL ?? 0} critical`,
                icon: Activity,
                color: 'text-green-healthy',
              },
              {
                label: 'Fleet API reach',
                value: `${metrics.reach.fleetDbMs}ms`,
                sub:
                  metrics.reach.consoleGatewayMs != null
                    ? `Console gw ${metrics.reach.consoleGatewayMs}ms`
                    : 'Console gw n/a',
                icon: Activity,
                color: 'text-amber-600',
              },
            ].map((k) => (
              <div key={k.label} className="bg-white p-4 rounded border border-border-card shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</div>
                    <div className="text-sm font-medium text-text-primary mt-1">{k.label}</div>
                    <div className="text-[11px] text-text-secondary mt-0.5">{k.sub}</div>
                  </div>
                  <k.icon className="w-5 h-5 text-text-secondary/60 shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Agent connectors" subtitle="Realtime status groups (8s refresh)">
              <HorizontalBarChart items={agentBarItems(metrics.agents.byStatus)} />
            </ChartCard>
            <ChartCard title="Server health" subtitle="Last known iDRAC health from inventory">
              <HorizontalBarChart
                items={['HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN'].map((h) => ({
                  label: h.charAt(0) + h.slice(1).toLowerCase(),
                  value: metrics.servers.byHealth[h] ?? 0,
                  color: HEALTH_COLORS[h],
                }))}
              />
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Reach time" subtitle="Fleet API & virtual console gateway (rolling window)">
              <LineReachChart history={history} />
            </ChartCard>
            <ChartCard title="Server models" subtitle="Pie chart by hardware model">
              <PieChartWithLegend slices={topModelSlices(metrics.servers.byModel)} />
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <ChartCard title="iDRAC generation" subtitle="Count per generation" className="lg:col-span-1">
              <PieChartWithLegend
                slices={Object.entries(metrics.servers.byGeneration).map(([label, value]) => ({
                  label: label.replace('GEN', 'iDRAC '),
                  value,
                }))}
              />
            </ChartCard>
            <div className="lg:col-span-2 bg-gradient-to-br from-dell-blue/5 to-white border border-border-card rounded p-6 flex flex-col justify-center">
              <h2 className="text-lg font-bold text-text-primary mb-2">Fleet management</h2>
              <p className="text-sm text-text-secondary mb-4 max-w-lg">
                Server inventory, search, tags, bulk CSV import, and per-server dashboards live under{' '}
                <strong>Servers</strong>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/servers"
                  className="h-10 px-5 inline-flex items-center gap-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover"
                >
                  <Server className="w-4 h-4" /> Open servers
                </Link>
                <Link
                  href="/agents"
                  className="h-10 px-5 inline-flex items-center gap-2 border border-dell-blue text-dell-blue text-sm font-semibold rounded hover:bg-dell-blue/5"
                >
                  <Radio className="w-4 h-4" /> Agent connectors
                </Link>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-text-secondary text-right mt-3">
            Last sample: {new Date(metrics.sampledAt).toLocaleString()}
          </p>
        </>
      ) : null}
    </>
  );
}
