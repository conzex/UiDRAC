/** Fleet metrics for operations dashboard (agents, servers, reach timing). */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AgentService } from '../agent/agent.service';
import { AGENT_CONNECTION_STATES } from '@idrac/shared';

export type FleetMetricsDto = {
  sampledAt: string;
  reach: {
    fleetDbMs: number;
    consoleGatewayMs: number | null;
  };
  agents: {
    total: number;
    byStatus: Record<string, number>;
  };
  servers: {
    total: number;
    byHealth: Record<string, number>;
    byGeneration: Record<string, number>;
    byModel: Record<string, number>;
  };
};

@Injectable()
export class DashboardService {
  private metricsCache = new Map<string, { at: number; data: FleetMetricsDto }>();
  private static CACHE_MS = 4_000;

  constructor(private prisma: PrismaService, private agents: AgentService) {}

  async getFleetMetrics(tenantId: string): Promise<FleetMetricsDto> {
    const cached = this.metricsCache.get(tenantId);
    if (cached && Date.now() - cached.at < DashboardService.CACHE_MS) {
      return cached.data;
    }

    const t0 = Date.now();
    const where = { tenantId };

    const servers = await this.prisma.server.findMany({
      where,
      select: { health: true, generation: true, model: true },
    });
    const agentRows = await this.agents.listAgents(tenantId);
    const fleetDbMs = Date.now() - t0;

    let consoleGatewayMs: number | null = null;
    const gw = (process.env.CONSOLE_GATEWAY_URL || 'http://u-console-gw:6080').replace(/\/$/, '');
    const cg0 = Date.now();
    try {
      const res = await fetch(`${gw}/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) consoleGatewayMs = Date.now() - cg0;
    } catch {
      consoleGatewayMs = null;
    }

    const byStatus: Record<string, number> = {};
    for (const s of AGENT_CONNECTION_STATES) byStatus[s] = 0;
    for (const a of agentRows) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }

    const byHealth: Record<string, number> = {
      HEALTHY: 0,
      WARNING: 0,
      CRITICAL: 0,
      UNKNOWN: 0,
    };
    const byGeneration: Record<string, number> = {};
    const byModel: Record<string, number> = {};

    for (const s of servers) {
      const h = String(s.health ?? 'UNKNOWN');
      byHealth[h] = (byHealth[h] ?? 0) + 1;
      const gen = s.generation ?? 'UNKNOWN';
      byGeneration[gen] = (byGeneration[gen] ?? 0) + 1;
      const model = (s.model?.trim() || 'Unknown model').slice(0, 80);
      byModel[model] = (byModel[model] ?? 0) + 1;
    }

    const data: FleetMetricsDto = {
      sampledAt: new Date().toISOString(),
      reach: { fleetDbMs, consoleGatewayMs },
      agents: { total: agentRows.length, byStatus },
      servers: {
        total: servers.length,
        byHealth,
        byGeneration,
        byModel,
      },
    };
    this.metricsCache.set(tenantId, { at: Date.now(), data });
    return data;
  }
}
