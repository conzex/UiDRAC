/** servers.service.ts — Server CRUD and full iDRAC adapter integration. */
import { Injectable, NotFoundException, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { getAdapter, probeGeneration } from '@idrac/adapters';
import type { IdracGeneration, IdracAdapter } from '@idrac/shared';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import { encryptSecret, decryptSecret } from '../../common/crypto.util';
import { AgentBridgeService } from '../agent/agent-bridge.service';
import { requireEdgeAgent } from '../../common/edge-agent.config';

const GEN_MAP: Record<string, string> = { '6': 'GEN6', '7': 'GEN7', '8': 'GEN8', '9': 'GEN9' };
const GEN_REVERSE: Record<string, IdracGeneration> = { GEN6: '6', GEN7: '7', GEN8: '8', GEN9: '9' };

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService, private agentBridge: AgentBridgeService) {}

  // ── CRUD ──

  async findAll(tenantId: string | null, query?: { page?: number; pageSize?: number; search?: string; generation?: string; health?: string }) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 25;
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
      if (!tenantId) throw new ServiceUnavailableException(`Tenant context required for ${UIDRAC_AGENT_NAME} probe.`);
      const connected = await this.agentBridge.isConnected(tenantId);
      if (!connected) {
        throw new ServiceUnavailableException(
          `Install your organization ${UIDRAC_AGENT_NAME} and wait until it shows Connected before probing iDRAC on your LAN.`,
        );
      }
      try {
        return await this.agentBridge.probeViaAgent(tenantId, ip, username, password);
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
    if (message.includes('Session only') || message.includes('credentials')) return message;
    return `Unable to connect to iDRAC at ${serverIp}: ${message || 'Unknown error'}`;
  }

  private async withAdapter<T>(
    id: string,
    tenantId: string | null,
    method: string,
    args: unknown[] = [],
    credentials?: { username: string; password: string },
  ): Promise<T> {
    const server = await this.findOne(id, tenantId);
    const gen = GEN_REVERSE[server.generation] ?? '9';
    const { user, pass } = this.resolveServerCredentials(server, credentials?.username, credentials?.password);

    if (server.credentialsMode === 'SESSION' && !credentials?.username) {
      throw new BadGatewayException(
        `iDRAC credentials for ${server.ip} were stored as session-only and have expired. Remove and re-add the server with "Save encrypted" credentials.`,
      );
    }

    if (requireEdgeAgent()) {
      if (!tenantId) {
        throw new ServiceUnavailableException(`Tenant context required for ${UIDRAC_AGENT_NAME} operations.`);
      }
      const connected = await this.agentBridge.isConnected(tenantId);
      if (!connected) {
        throw new ServiceUnavailableException(
          `Your ${UIDRAC_AGENT_NAME} is not connected. Install and start an agent from Agents → Download Agent.`,
        );
      }
      try {
        return await this.agentBridge.invokeAdapter<T>(tenantId, {
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
      const target = (adapter as Record<string, unknown>)[method];
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
    return this.withAdapter(id, tenantId, 'powerAction', [action]);
  }

  // ── Power & Thermal ──

  async getPowerReadings(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getPowerReadings');
  }

  async getThermal(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getThermal');
  }

  async setPowerCap(id: string, tenantId: string | null, watts: number | null) {
    return this.withAdapter(id, tenantId, 'setPowerCap', [watts]);
  }

  // ── BIOS ──

  async getBiosConfig(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getBiosConfig');
  }

  async setBiosAttributes(id: string, tenantId: string | null, attrs: Record<string, string>) {
    return this.withAdapter(id, tenantId, 'setBiosAttributes', [attrs]);
  }

  async setBootOrder(id: string, tenantId: string | null, order: string[]) {
    return this.withAdapter(id, tenantId, 'setBootOrder', [order]);
  }

  // ── iDRAC Users ──

  async getIdracUsers(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getUsers');
  }

  async createIdracUser(id: string, tenantId: string | null, name: string, password: string, privilege: string) {
    return this.withAdapter(id, tenantId, 'createUser', [name, password, privilege]);
  }

  async deleteIdracUser(id: string, tenantId: string | null, userId: number) {
    return this.withAdapter(id, tenantId, 'deleteUser', [userId]);
  }

  async updateIdracUserPassword(id: string, tenantId: string | null, userId: number, password: string) {
    return this.withAdapter(id, tenantId, 'updateUserPassword', [userId, password]);
  }

  // ── Virtual Media ──

  async getVirtualMedia(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getVirtualMedia');
  }

  async mountVirtualMedia(id: string, tenantId: string | null, iso: string) {
    return this.withAdapter(id, tenantId, 'mountVirtualMedia', [iso]);
  }

  async ejectVirtualMedia(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'ejectVirtualMedia');
  }

  // ── iDRAC Network ──

  async getIdracNetwork(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'getIdracNetwork');
  }

  async setIdracNetwork(id: string, tenantId: string | null, config: Record<string, unknown>) {
    return this.withAdapter(id, tenantId, 'setIdracNetwork', [config]);
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
    return this.withAdapter(id, tenantId, 'deleteLcJob', [jobId]);
  }

  async clearLcJobs(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, 'clearLcJobs');
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
}
