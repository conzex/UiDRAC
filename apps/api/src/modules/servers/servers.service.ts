/** servers.service.ts — Server CRUD and full iDRAC adapter integration. */
import {
  Injectable,
  NotFoundException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { getAdapter, probeGeneration, runAdapterBatch, type AdapterBatchCall } from '@idrac/adapters';
import type { IdracGeneration, IdracAdapter } from '@idrac/shared';
import { UIDRAC_AGENT_NAME, type ConsoleLaunch, type ServerConsoleLaunch } from '@idrac/shared';
import { encryptSecret, decryptSecret } from '../../common/crypto.util';
import { AgentBridgeService } from '../agent/agent-bridge.service';
import { requireEdgeAgent } from '../../common/edge-agent.config';
import { parsePagination } from '../../common/pagination';
import { withIdracServerLock } from '../../common/idrac-server-lock';
import { IDRAC_CACHE_SLICES, ServerIdracCacheService } from './server-idrac-cache.service';
import { ServerConsoleTunnelService } from './server-console-tunnel.service';

const GEN_MAP: Record<string, string> = { '6': 'GEN6', '7': 'GEN7', '8': 'GEN8', '9': 'GEN9' };
const GEN_REVERSE: Record<string, IdracGeneration> = { GEN6: '6', GEN7: '7', GEN8: '8', GEN9: '9' };

@Injectable()
export class ServersService {
  constructor(
    private prisma: PrismaService,
    private agentBridge: AgentBridgeService,
    private idracCache: ServerIdracCacheService,
    private consoleTunnel: ServerConsoleTunnelService,
  ) {}

  private async clearIdracSnapshots(serverId: string) {
    await this.idracCache.invalidate(serverId);
  }

  private assertBatchPayload(data: Record<string, unknown>, serverIp: string) {
    const keys = Object.keys(data).filter((k) => k !== '_errors');
    if (keys.length > 0) return;
    const errors = data._errors as Record<string, string> | undefined;
    const raw = errors ? Object.values(errors) : [];
    const detail =
      raw.find((m) => m.includes('busy or rate-limited')) ||
      raw.find((m) => !m.includes('status code 503')) ||
      raw[0] ||
      'No data returned from iDRAC';
    if (detail.includes('status code 503') || detail.includes('rate-limited')) {
      throw new BadGatewayException(
        `iDRAC at ${serverIp} is busy or rate-limited. Wait a few seconds and use Sync from iDRAC — cached data is shown when available.`,
      );
    }
    throw new BadGatewayException(`Unable to load data from iDRAC at ${serverIp}: ${detail}`);
  }

  // ── CRUD ──

  async findAll(tenantId: string | null, query?: { page?: number; pageSize?: number; search?: string; generation?: string; health?: string }) {
    const { page, pageSize } = parsePagination(query);
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (query?.generation) where.generation = query.generation;
    if (query?.health) where.health = query.health.toUpperCase();
    if (query?.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.server.findMany({ where: where as any, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { tenant: { select: { name: true, slug: true } } } }),
      this.prisma.server.count({ where: where as any }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, tenantId: string | null) {
    const where: Record<string, unknown> = { id };
    if (tenantId) where.tenantId = tenantId;
    const server = await this.prisma.server.findFirst({ where: where as any });
    if (!server) throw new NotFoundException('Server not found');
    return server;
  }

  async probe(ip: string, username: string, password: string, tenantId?: string) {
    if (requireEdgeAgent()) {
      const agentTenantId = (tenantId || '').trim();
      if (!agentTenantId) {
        throw new ServiceUnavailableException(`Tenant context required for ${UIDRAC_AGENT_NAME} probe.`);
      }
      const connected = await this.agentBridge.isConnected(agentTenantId);
      if (!connected) {
        throw new ServiceUnavailableException(
          `Install your organization ${UIDRAC_AGENT_NAME} and wait until it shows Connected before probing iDRAC on your LAN.`,
        );
      }
      try {
        return await this.agentBridge.probeViaAgent(agentTenantId, ip, username, password);
      } catch (err: any) {
        const msg = err?.message || `${UIDRAC_AGENT_NAME} probe failed`;
        throw new BadGatewayException(msg);
      }
    }
    return this.probeDirect(ip, username, password);
  }

  private async probeDirect(ip: string, username: string, password: string) {
    let gen: IdracGeneration;
    try {
      gen = await probeGeneration(ip, username, password);
    } catch (err: any) {
      throw new BadGatewayException(`Unable to detect iDRAC at ${ip}. Ensure the host is reachable and credentials are correct.`);
    }
    const adapter = getAdapter(gen, { ip, username, password });
    try {
      await adapter.connect();
      const info = await adapter.getSystemInfo();
      const health = await adapter.getHealth();
      return { generation: gen, model: info.model, serviceTag: info.serviceTag, firmwareVersion: info.biosVersion, health: health.overall };
    } catch (err: any) {
      throw new BadGatewayException(`Connected to iDRAC ${gen} at ${ip} but failed to retrieve data: ${err?.message || 'Unknown error'}`);
    } finally {
      await adapter.disconnect().catch(() => {});
    }
  }

  async create(tenantId: string, data: { name: string; ip: string; username: string; password: string; credentialsMode: string; tags?: string[] }) {
    const probe = await this.probe(data.ip, data.username, data.password, tenantId);
    const isSaved = data.credentialsMode === 'saved';
    const creds = isSaved ? encryptSecret(JSON.stringify({ username: data.username, password: data.password })) : null;
    const server = await this.prisma.server.create({
      data: {
        tenantId, name: data.name, ip: data.ip,
        generation: (GEN_MAP[probe.generation] ?? 'GEN9') as any,
        model: probe.model, serviceTag: probe.serviceTag, firmwareVersion: probe.firmwareVersion,
        credentialsMode: isSaved ? 'SAVED' : 'SESSION',
        credentialsEncrypted: creds?.encrypted ?? null,
        credentialsIv: creds?.iv ?? null,
        credentialsTag: creds?.tag ?? null,
        tags: data.tags ?? [], health: (probe.health?.toUpperCase() ?? 'UNKNOWN') as any,
        lastSeenAt: new Date(),
      },
    });
    return server;
  }

  async update(id: string, tenantId: string | null, data: { name?: string; tags?: string[] }) {
    await this.findOne(id, tenantId);
    return this.prisma.server.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string | null) {
    await this.findOne(id, tenantId);
    return this.prisma.server.delete({ where: { id } });
  }

  // ── Adapter Helpers ──

  private resolveServerCredentials(
    server: { credentialsEncrypted?: Buffer | null; credentialsIv?: Buffer | null; credentialsTag?: Buffer | null },
    username?: string,
    password?: string,
  ): { user: string; pass: string } {
    let user = username ?? 'root';
    let pass = password ?? 'calvin';
    if (!username && server.credentialsEncrypted && server.credentialsIv && server.credentialsTag) {
      try {
        const decrypted = JSON.parse(decryptSecret(
          Buffer.from(server.credentialsEncrypted),
          Buffer.from(server.credentialsIv),
          Buffer.from(server.credentialsTag),
        ));
        user = decrypted.username || user;
        pass = decrypted.password || pass;
      } catch { /* fallback to defaults */ }
    }
    return { user, pass };
  }

  private getAdapterForServer(server: { ip: string; generation: string; credentialsEncrypted?: Buffer | null; credentialsIv?: Buffer | null; credentialsTag?: Buffer | null }, username?: string, password?: string): IdracAdapter {
    const gen = GEN_REVERSE[server.generation] ?? '9';
    const { user, pass } = this.resolveServerCredentials(server, username, password);
    return getAdapter(gen, { ip: server.ip, username: user, password: pass });
  }

  private mapAdapterError(serverIp: string, err: any): string {
    const message = err?.message || '';
    if (err?.code === 'ECONNREFUSED') return `iDRAC at ${serverIp} refused the connection. Verify the iDRAC is powered on and accessible.`;
    if (err?.code === 'ETIMEDOUT' || err?.code === 'ECONNABORTED' || message.includes('timeout')) {
      return `Connection to iDRAC at ${serverIp} timed out. Check network connectivity.`;
    }
    if (err?.code === 'ENOTFOUND') return `Cannot resolve hostname ${serverIp}. Check the address.`;
    if (err?.response?.status === 401 || message.toLowerCase().includes('auth')) {
      return `Authentication failed for iDRAC at ${serverIp}. Check credentials.`;
    }
    if (err?.response?.status === 503 || message.includes('status code 503')) {
      return `iDRAC at ${serverIp} is busy or rate-limited (HTTP 503). Wait a few seconds and retry — the UiDRAC Agent now queues LAN requests to avoid this.`;
    }
    if (message.includes('Session only') || message.includes('credentials')) return message;
    return `Unable to connect to iDRAC at ${serverIp}: ${message || 'Unknown error'}`;
  }

  /** Tenant that owns the server (for agent routing). Platform admins pass null for list/find filters only. */
  private tenantForAgentOps(requestTenantId: string | null, serverTenantId: string): string {
    const effective = (requestTenantId || serverTenantId || '').trim();
    if (!effective) {
      throw new ServiceUnavailableException(`Tenant context required for ${UIDRAC_AGENT_NAME} operations.`);
    }
    return effective;
  }

  private async withAdapter<T>(
    id: string,
    tenantId: string | null,
    method: string,
    args: unknown[] = [],
    credentials?: { username: string; password: string },
  ): Promise<T> {
    return this.withAdapterInner(id, tenantId, method, args, credentials);
  }

  private async withAdapterInner<T>(
    id: string,
    tenantId: string | null,
    method: string,
    args: unknown[] = [],
    credentials?: { username: string; password: string },
  ): Promise<T> {
    const server = await this.findOne(id, tenantId);
    const agentTenantId = this.tenantForAgentOps(tenantId, server.tenantId);
    const gen = GEN_REVERSE[server.generation] ?? '9';
    const { user, pass } = this.resolveServerCredentials(server, credentials?.username, credentials?.password);

    if (server.credentialsMode === 'SESSION' && !credentials?.username) {
      throw new BadGatewayException(
        `iDRAC credentials for ${server.ip} were stored as session-only and have expired. Remove and re-add the server with "Save encrypted" credentials.`,
      );
    }

    if (requireEdgeAgent()) {
      const connected = await this.agentBridge.isConnected(agentTenantId);
      if (!connected) {
        throw new ServiceUnavailableException(
          `Your ${UIDRAC_AGENT_NAME} is not connected. Install and start an agent from Agents → Download Agent.`,
        );
      }
      try {
        return await this.agentBridge.invokeAdapter<T>(agentTenantId, {
          generation: gen,
          ip: server.ip,
          username: user,
          password: pass,
          method,
          args,
        });
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ServiceUnavailableException) throw err;
        throw new BadGatewayException(this.mapAdapterError(server.ip, err));
      }
    }

    const adapter = this.getAdapterForServer(server, credentials?.username, credentials?.password);
    try {
      await adapter.connect();
    } catch (err: any) {
      throw new BadGatewayException(this.mapAdapterError(server.ip, err));
    }
    try {
      const target = (adapter as unknown as Record<string, unknown>)[method];
      if (typeof target !== 'function') {
        throw new BadGatewayException(`Unknown adapter method: ${method}`);
      }
      return await (target as (...a: unknown[]) => Promise<T>).apply(adapter, args);
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadGatewayException) throw err;
      const msg = err?.message?.includes('timeout')
        ? `iDRAC at ${server.ip} timed out while fetching data.`
        : `Error communicating with iDRAC at ${server.ip}: ${err?.message || 'Unknown error'}`;
      throw new BadGatewayException(msg);
    } finally {
      await adapter.disconnect().catch(() => {});
    }
  }

  private async withAdapterBatch(
    id: string,
    tenantId: string | null,
    calls: AdapterBatchCall[],
    parallel = false,
    credentials?: { username: string; password: string },
    timeoutMs = 180_000,
  ): Promise<Record<string, unknown>> {
    return this.withAdapterBatchInner(id, tenantId, calls, parallel, credentials, timeoutMs);
  }

  private async withAdapterBatchInner(
    id: string,
    tenantId: string | null,
    calls: AdapterBatchCall[],
    parallel: boolean,
    credentials?: { username: string; password: string },
    timeoutMs = 90_000,
  ): Promise<Record<string, unknown>> {
    return withIdracServerLock(id, () =>
      this.withAdapterBatchInnerUnlocked(id, tenantId, calls, parallel, credentials, timeoutMs),
    );
  }

  private async withAdapterBatchInnerUnlocked(
    id: string,
    tenantId: string | null,
    calls: AdapterBatchCall[],
    parallel: boolean,
    credentials?: { username: string; password: string },
    timeoutMs = 90_000,
  ): Promise<Record<string, unknown>> {
    const server = await this.findOne(id, tenantId);
    const agentTenantId = this.tenantForAgentOps(tenantId, server.tenantId);
    const gen = GEN_REVERSE[server.generation] ?? '9';
    const { user, pass } = this.resolveServerCredentials(server, credentials?.username, credentials?.password);

    if (server.credentialsMode === 'SESSION' && !credentials?.username) {
      throw new BadGatewayException(
        `iDRAC credentials for ${server.ip} were stored as session-only and have expired. Remove and re-add the server with "Save encrypted" credentials.`,
      );
    }

    if (requireEdgeAgent()) {
      const connected = await this.agentBridge.isConnected(agentTenantId);
      if (!connected) {
        throw new ServiceUnavailableException(
          `Your ${UIDRAC_AGENT_NAME} is not connected. Install and start an agent from Agents → Download Agent.`,
        );
      }
      try {
        const data = await this.agentBridge.invokeAdapterBatch(
          agentTenantId,
          {
            generation: gen,
            ip: server.ip,
            username: user,
            password: pass,
            calls,
            parallel,
          },
          timeoutMs,
        );
        this.assertBatchPayload(data as Record<string, unknown>, server.ip);
        return data as Record<string, unknown>;
      } catch (err: any) {
        if (
          err instanceof NotFoundException ||
          err instanceof ServiceUnavailableException ||
          err instanceof BadGatewayException ||
          err instanceof GatewayTimeoutException
        ) {
          throw err;
        }
        const msg = err?.response?.message || err?.message || String(err);
        throw new BadGatewayException(this.mapAdapterError(server.ip, { message: msg }));
      }
    }

    const adapter = this.getAdapterForServer(server, credentials?.username, credentials?.password);
    try {
      await adapter.connect();
    } catch (err: any) {
      throw new BadGatewayException(this.mapAdapterError(server.ip, err));
    }
    try {
      const data = await runAdapterBatch(adapter, calls, parallel, true);
      this.assertBatchPayload(data, server.ip);
      return data;
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadGatewayException) throw err;
      throw new BadGatewayException(
        `Error communicating with iDRAC at ${server.ip}: ${err?.message || 'Unknown error'}`,
      );
    } finally {
      await adapter.disconnect().catch(() => {});
    }
  }

  async getDashboardSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.dashboard, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'health', method: 'getHealth' },
          { key: 'system', method: 'getSystemInfo' },
          { key: 'logs', method: 'getLogs', args: [{ limit: 5 }] },
        ],
        false,
      );
      return { health: data.health, system: data.system, logs: data.logs, errors: data._errors ?? undefined };
    });
  }

  async getMaintenanceSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.maintenance, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'firmware', method: 'getFirmware' },
          { key: 'logs', method: 'getLogs', args: [{ limit: 25 }] },
        ],
        false,
      );
      return {
        firmware: data.firmware,
        logs: data.logs,
        errors: data._errors ?? undefined,
      };
    });
  }

  async getMaintenanceDiagnosticsSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.maintenanceDiagnostics, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'sensors', method: 'getSensors' },
          { key: 'powerReadings', method: 'getPowerReadings' },
          { key: 'thermal', method: 'getThermal' },
        ],
        false,
      );
      return {
        sensors: data.sensors,
        powerReadings: data.powerReadings,
        thermal: data.thermal,
        errors: data._errors ?? undefined,
      };
    });
  }

  async getPowerSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.power, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'system', method: 'getSystemInfo' },
          { key: 'powerReadings', method: 'getPowerReadings' },
          { key: 'thermal', method: 'getThermal' },
        ],
        false,
      );
      return {
        system: data.system,
        powerReadings: data.powerReadings,
        thermal: data.thermal,
        errors: data._errors ?? undefined,
      };
    });
  }

  async getIdracSettingsSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.idracSettings, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'network', method: 'getIdracNetwork' },
          { key: 'users', method: 'getUsers' },
          { key: 'vmedia', method: 'getVirtualMedia' },
        ],
        false,
      );
      return {
        network: data.network,
        users: data.users,
        vmedia: data.vmedia,
        errors: data._errors ?? undefined,
      };
    });
  }

  async getIdracSettingsAdvancedSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.idracSettingsAdvanced, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'certificates', method: 'getCertificates' },
          { key: 'licenses', method: 'getLicenses' },
          { key: 'jobs', method: 'getLcJobs' },
        ],
        false,
      );
      return {
        certificates: data.certificates,
        licenses: data.licenses,
        jobs: data.jobs,
        errors: data._errors ?? undefined,
      };
    });
  }

  async getConfigurationSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.configuration, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'bios', method: 'getBiosConfig' },
          { key: 'cpus', method: 'getCpus' },
          { key: 'memory', method: 'getMemory' },
          { key: 'pcie', method: 'getPcieDevices' },
        ],
        false,
      );
      return { bios: data.bios, cpus: data.cpus, memory: data.memory, pcie: data.pcie, errors: data._errors ?? undefined };
    });
  }

  async getSystemSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.system, refresh, async () => {
      const data = await this.withAdapterBatch(
        id,
        tenantId,
        [
          { key: 'system', method: 'getSystemInfo' },
          { key: 'network', method: 'getNetwork' },
        ],
        false,
      );
      return { system: data.system, network: data.network, errors: data._errors ?? undefined };
    });
  }

  async getStorageSummary(id: string, tenantId: string | null, refresh = false) {
    return this.idracCache.getOrLoad(id, IDRAC_CACHE_SLICES.storage, refresh, async () => {
      const data = await this.withAdapterBatchInner(
        id,
        tenantId,
        [{ key: 'storage', method: 'getStorage' }],
        false,
        undefined,
        180_000,
      );
      return { storage: data.storage, errors: data._errors ?? undefined };
    });
  }

  /** Load every tab slice once (sequential iDRAC sync) — populates DB + returns all payloads. */
  async warmAllSummaries(id: string, tenantId: string | null, refresh = false) {
    const steps: { key: string; load: (force: boolean) => Promise<unknown> }[] = [
      { key: 'dashboard', load: (f) => this.getDashboardSummary(id, tenantId, f) },
      { key: 'system', load: (f) => this.getSystemSummary(id, tenantId, f) },
      { key: 'storage', load: (f) => this.getStorageSummary(id, tenantId, f) },
      { key: 'configuration', load: (f) => this.getConfigurationSummary(id, tenantId, f) },
      { key: 'maintenance', load: (f) => this.getMaintenanceSummary(id, tenantId, f) },
      { key: 'maintenance-diagnostics', load: (f) => this.getMaintenanceDiagnosticsSummary(id, tenantId, f) },
      { key: 'power', load: (f) => this.getPowerSummary(id, tenantId, f) },
      { key: 'idrac-settings', load: (f) => this.getIdracSettingsSummary(id, tenantId, f) },
      { key: 'idrac-settings-advanced', load: (f) => this.getIdracSettingsAdvancedSummary(id, tenantId, f) },
    ];
    const slices: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    for (const step of steps) {
      try {
        slices[step.key] = await step.load(refresh);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof (err as { message?: string })?.message === 'string'
              ? (err as { message: string }).message
              : 'Sync failed';
        errors[step.key] = msg;
        if (refresh) {
          try {
            slices[step.key] = await step.load(false);
          } catch {
            /* no cache */
          }
        }
      }
    }
    return {
      warmedAt: new Date().toISOString(),
      refresh,
      slices,
      errors: Object.keys(errors).length ? errors : undefined,
    };
  }

  // ── Core Features ──

  async getHealth(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getHealth');
  }

  async getSystemInfo(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getSystemInfo');
  }

  async getStorage(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getStorage');
  }

  async getNetwork(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getNetwork');
  }

  async getFirmware(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getFirmware');
  }

  async getSensors(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getSensors');
  }

  async getSel(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getSel');
  }

  async getLogs(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getLogs', [{ limit: 50 }]);
  }

  async powerAction(id: string, tenantId: string | null, action: string) {
    const result = await this.withAdapter(id, tenantId, 'powerAction', [action]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── Power & Thermal ──

  async getPowerReadings(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getPowerReadings');
  }

  async getThermal(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getThermal');
  }

  async setPowerCap(id: string, tenantId: string | null, watts: number | null) {
    const result = await this.withAdapter(id, tenantId, 'setPowerCap', [watts]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── BIOS ──

  async getBiosConfig(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getBiosConfig');
  }

  async setBiosAttributes(id: string, tenantId: string | null, attrs: Record<string, string>) {
    const result = await this.withAdapter(id, tenantId, 'setBiosAttributes', [attrs]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  async setBootOrder(id: string, tenantId: string | null, order: string[]) {
    const result = await this.withAdapter(id, tenantId, 'setBootOrder', [order]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── iDRAC Users ──

  async getIdracUsers(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getUsers');
  }

  async createIdracUser(id: string, tenantId: string | null, name: string, password: string, privilege: string) {
    const result = await this.withAdapter(id, tenantId, 'createUser', [name, password, privilege]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  async deleteIdracUser(id: string, tenantId: string | null, userId: number) {
    const result = await this.withAdapter(id, tenantId, 'deleteUser', [userId]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  async updateIdracUserPassword(id: string, tenantId: string | null, userId: number, password: string) {
    const result = await this.withAdapter(id, tenantId, 'updateUserPassword', [userId, password]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── Virtual Media ──

  async getVirtualMedia(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getVirtualMedia');
  }

  async mountVirtualMedia(id: string, tenantId: string | null, iso: string) {
    const result = await this.withAdapter(id, tenantId, 'mountVirtualMedia', [iso]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  async ejectVirtualMedia(id: string, tenantId: string | null) {
    const result = await this.withAdapter(id, tenantId, 'ejectVirtualMedia');
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── iDRAC Network ──

  async getIdracNetwork(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getIdracNetwork');
  }

  async setIdracNetwork(id: string, tenantId: string | null, config: Record<string, unknown>) {
    const result = await this.withAdapter(id, tenantId, 'setIdracNetwork', [config]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── Inventory ──

  async getMemory(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getMemory');
  }

  async getCpus(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getCpus');
  }

  async getPcieDevices(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getPcieDevices');
  }

  // ── Lifecycle Controller ──

  async getLcJobs(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getLcJobs');
  }

  async deleteLcJob(id: string, tenantId: string | null, jobId: string) {
    const result = await this.withAdapter(id, tenantId, 'deleteLcJob', [jobId]);
    await this.clearIdracSnapshots(id);
    return result;
  }

  async clearLcJobs(id: string, tenantId: string | null) {
    const result = await this.withAdapter(id, tenantId, 'clearLcJobs');
    await this.clearIdracSnapshots(id);
    return result;
  }

  // ── Certificates ──

  async getCertificates(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getCertificates');
  }

  // ── Licenses ──

  async getLicenses(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getLicenses');
  }

  // ── SCP ──

  async exportScp(id: string, tenantId: string | null, format: 'xml' | 'json') {
    return this.withAdapter(id, tenantId, 'exportScp', [format]);
  }

  // ── Identify ──

  async setIdentify(id: string, tenantId: string | null, on: boolean) {
    return this.withAdapter(id, tenantId, 'setIdentify', [on]);
  }

  // ── Console ──

  async getConsoleUrl(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getConsoleUrl');
  }

  async launchConsole(id: string, tenantId: string | null): Promise<ServerConsoleLaunch> {
    const server = await this.findOne(id, tenantId);
    const gen = GEN_REVERSE[server.generation] ?? '9';
    const isLegacy = gen === '6' || gen === '7';
    const hasSaved =
      server.credentialsMode === 'SAVED' && Boolean(server.credentialsEncrypted);

    if (server.credentialsMode === 'SESSION' && !server.credentialsEncrypted) {
      throw new BadGatewayException(
        `iDRAC credentials for ${server.ip} were stored as session-only and have expired. Re-add the server with saved credentials to use the console.`,
      );
    }

    const launch = await this.withAdapter<ConsoleLaunch>(id, tenantId, 'getConsoleUrl');
    let url = launch.url;
    let gatewaySessionId: string | undefined;

    if (isLegacy) {
      const gw = (process.env.CONSOLE_GATEWAY_URL || 'http://u-console-gw:6080').replace(/\/$/, '');
      const { user, pass } = this.resolveServerCredentials(server);
      const agentTenantId = this.tenantForAgentOps(tenantId, server.tenantId);
      let res: Response;
      try {
        res = await fetch(`${gw}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: id,
          tenantId: agentTenantId,
          idracHost: server.ip,
          idracUser: user,
          idracPassword: pass,
          generation: gen,
        }),
        });
      } catch {
        throw new BadGatewayException(
          'Console gateway is not reachable. Run docker compose up -d u-console-gw or use an HTML5 iDRAC.',
        );
      }
      if (!res.ok) {
        const body = await res.text();
        throw new BadGatewayException(`Console gateway: ${body || res.statusText}`);
      }
      const spawned = (await res.json()) as { sessionId: string };
      gatewaySessionId = spawned.sessionId;
      const publicBase = (process.env.PUBLIC_CONSOLE_URL || process.env.NEXT_PUBLIC_CONSOLE_URL || 'http://localhost:6080')
        .replace(/\/$/, '');
      const wsBase = publicBase.replace(/^http/, 'ws');
      url = `${publicBase}/?session=${encodeURIComponent(gatewaySessionId)}&ws=${encodeURIComponent(`${wsBase}/console/ws?session=${gatewaySessionId}`)}`;
    } else if (requireEdgeAgent()) {
      const agentTenantId = this.tenantForAgentOps(tenantId, server.tenantId);
      const token = this.consoleTunnel.extractIdracToken(url);
      await this.consoleTunnel.storeTunnelConfig(id, {
        ip: server.ip,
        token,
        agentTenantId,
      });
      const session = await this.consoleTunnel.createTunnelSession(id, url);
      url = session.url;
    }

    return {
      type: launch.type,
      url,
      generation: launch.generation,
      authenticated: Boolean(launch.authenticated) || hasSaved,
      serverId: id,
      serverName: server.name,
      serverIp: server.ip,
      hasSavedCredentials: hasSaved,
      autoLaunch: hasSaved || Boolean(launch.authenticated),
      gatewaySessionId,
    };
  }

  async disconnectConsole(serverId: string, tenantId: string | null, _requestTenantId: string) {
    const server = await this.findOne(serverId, tenantId);
    const agentTenantId = this.tenantForAgentOps(tenantId, server.tenantId);
    const sessionId = `${agentTenantId}:${serverId}`;
    const gw = (process.env.CONSOLE_GATEWAY_URL || 'http://u-console-gw:6080').replace(/\/$/, '');
    try {
      await fetch(`${gw}/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    } catch {
      /* gateway may be offline for HTML5-only tenants */
    }
    return { ok: true };
  }
}
