/** servers.service.ts — Server CRUD and full iDRAC adapter integration. */
import { Injectable, NotFoundException, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { getAdapter, probeGeneration } from '@idrac/adapters';
import type { IdracGeneration, IdracAdapter } from '@idrac/shared';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
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
    const server = await this.prisma.server.create({
      data: {
        tenantId, name: data.name, ip: data.ip,
        generation: (GEN_MAP[probe.generation] ?? 'GEN9') as any,
        model: probe.model, serviceTag: probe.serviceTag, firmwareVersion: probe.firmwareVersion,
        credentialsMode: data.credentialsMode === 'saved' ? 'SAVED' : 'SESSION',
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

  private getAdapterForServer(server: { ip: string; generation: string }, username = 'root', password = 'calvin'): IdracAdapter {
    const gen = GEN_REVERSE[server.generation] ?? '9';
    return getAdapter(gen, { ip: server.ip, username, password });
  }

  private async withAdapter<T>(id: string, tenantId: string | null, fn: (adapter: IdracAdapter) => Promise<T>): Promise<T> {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    try {
      await adapter.connect();
    } catch (err: any) {
      const msg = err?.code === 'ECONNREFUSED' ? `iDRAC at ${server.ip} refused the connection. Verify the iDRAC is powered on and accessible.`
        : err?.code === 'ETIMEDOUT' || err?.code === 'ECONNABORTED' || err?.message?.includes('timeout') ? `Connection to iDRAC at ${server.ip} timed out. Check network connectivity.`
        : err?.code === 'ENOTFOUND' ? `Cannot resolve hostname ${server.ip}. Check the address.`
        : err?.response?.status === 401 ? `Authentication failed for iDRAC at ${server.ip}. Check credentials.`
        : `Unable to connect to iDRAC at ${server.ip}: ${err?.message || 'Unknown error'}`;
      throw new BadGatewayException(msg);
    }
    try {
      return await fn(adapter);
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadGatewayException) throw err;
      const msg = err?.message?.includes('timeout') ? `iDRAC at ${server.ip} timed out while fetching data.`
        : `Error communicating with iDRAC at ${server.ip}: ${err?.message || 'Unknown error'}`;
      throw new BadGatewayException(msg);
    } finally {
      await adapter.disconnect().catch(() => {});
    }
  }

  // ── Core Features ──

  async getHealth(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getHealth());
  }

  async getSystemInfo(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getSystemInfo());
  }

  async getStorage(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getStorage());
  }

  async getNetwork(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getNetwork());
  }

  async getFirmware(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getFirmware());
  }

  async getSensors(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getSensors());
  }

  async getSel(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getSel());
  }

  async getLogs(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getLogs({ limit: 50 }));
  }

  async powerAction(id: string, tenantId: string | null, action: string) {
    return this.withAdapter(id, tenantId, (a) => a.powerAction(action as any));
  }

  // ── Power & Thermal ──

  async getPowerReadings(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getPowerReadings());
  }

  async getThermal(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getThermal());
  }

  async setPowerCap(id: string, tenantId: string | null, watts: number | null) {
    return this.withAdapter(id, tenantId, (a) => a.setPowerCap(watts));
  }

  // ── BIOS ──

  async getBiosConfig(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getBiosConfig());
  }

  async setBiosAttributes(id: string, tenantId: string | null, attrs: Record<string, string>) {
    return this.withAdapter(id, tenantId, (a) => a.setBiosAttributes(attrs));
  }

  async setBootOrder(id: string, tenantId: string | null, order: string[]) {
    return this.withAdapter(id, tenantId, (a) => a.setBootOrder(order));
  }

  // ── iDRAC Users ──

  async getIdracUsers(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getUsers());
  }

  async createIdracUser(id: string, tenantId: string | null, name: string, password: string, privilege: string) {
    return this.withAdapter(id, tenantId, (a) => a.createUser(name, password, privilege));
  }

  async deleteIdracUser(id: string, tenantId: string | null, userId: number) {
    return this.withAdapter(id, tenantId, (a) => a.deleteUser(userId));
  }

  async updateIdracUserPassword(id: string, tenantId: string | null, userId: number, password: string) {
    return this.withAdapter(id, tenantId, (a) => a.updateUserPassword(userId, password));
  }

  // ── Virtual Media ──

  async getVirtualMedia(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getVirtualMedia());
  }

  async mountVirtualMedia(id: string, tenantId: string | null, iso: string) {
    return this.withAdapter(id, tenantId, (a) => a.mountVirtualMedia(iso));
  }

  async ejectVirtualMedia(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.ejectVirtualMedia());
  }

  // ── iDRAC Network ──

  async getIdracNetwork(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getIdracNetwork());
  }

  async setIdracNetwork(id: string, tenantId: string | null, config: Record<string, unknown>) {
    return this.withAdapter(id, tenantId, (a) => a.setIdracNetwork(config as any));
  }

  // ── Inventory ──

  async getMemory(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getMemory());
  }

  async getCpus(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getCpus());
  }

  async getPcieDevices(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getPcieDevices());
  }

  // ── Lifecycle Controller ──

  async getLcJobs(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getLcJobs());
  }

  async deleteLcJob(id: string, tenantId: string | null, jobId: string) {
    return this.withAdapter(id, tenantId, (a) => a.deleteLcJob(jobId));
  }

  async clearLcJobs(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.clearLcJobs());
  }

  // ── Certificates ──

  async getCertificates(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getCertificates());
  }

  // ── Licenses ──

  async getLicenses(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getLicenses());
  }

  // ── SCP ──

  async exportScp(id: string, tenantId: string | null, format: 'xml' | 'json') {
    return this.withAdapter(id, tenantId, (a) => a.exportScp(format));
  }

  // ── Identify ──

  async setIdentify(id: string, tenantId: string | null, on: boolean) {
    return this.withAdapter(id, tenantId, (a) => a.setIdentify(on));
  }

  // ── Console ──

  async getConsoleUrl(id: string, tenantId: string | null) {
    return this.withAdapter(id, tenantId, (a) => a.getConsoleUrl());
  }
}
