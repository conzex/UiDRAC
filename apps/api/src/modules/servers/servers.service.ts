/** servers.service.ts — Server CRUD and iDRAC adapter integration. */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { getAdapter, probeGeneration } from '@idrac/adapters';
import type { IdracGeneration } from '@idrac/shared';

const GEN_MAP: Record<string, string> = { '6': 'GEN6', '7': 'GEN7', '8': 'GEN8', '9': 'GEN9' };
const GEN_REVERSE: Record<string, IdracGeneration> = { GEN6: '6', GEN7: '7', GEN8: '8', GEN9: '9' };

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { page?: number; pageSize?: number; search?: string; generation?: string; health?: string }) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 25;
    const where: Record<string, unknown> = { tenantId };
    if (query?.generation) where.generation = query.generation;
    if (query?.health) where.health = query.health.toUpperCase();
    if (query?.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.server.findMany({ where: where as any, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.server.count({ where: where as any }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, tenantId: string) {
    const server = await this.prisma.server.findFirst({ where: { id, tenantId } });
    if (!server) throw new NotFoundException('Server not found');
    return server;
  }

  async probe(ip: string, username: string, password: string) {
    const gen = await probeGeneration(ip, username, password);
    const adapter = getAdapter(gen, { ip, username, password });
    await adapter.connect();
    try {
      const info = await adapter.getSystemInfo();
      const health = await adapter.getHealth();
      return { generation: gen, model: info.model, serviceTag: info.serviceTag, firmwareVersion: info.biosVersion, health: health.overall };
    } finally { await adapter.disconnect(); }
  }

  async create(tenantId: string, data: { name: string; ip: string; username: string; password: string; credentialsMode: string; tags?: string[] }) {
    const probe = await this.probe(data.ip, data.username, data.password);
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

  async update(id: string, tenantId: string, data: { name?: string; tags?: string[] }) {
    await this.findOne(id, tenantId);
    return this.prisma.server.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.server.delete({ where: { id } });
  }

  private getAdapterForServer(server: { ip: string; generation: string }, username = 'root', password = 'calvin') {
    const gen = GEN_REVERSE[server.generation] ?? '9';
    return getAdapter(gen, { ip: server.ip, username, password });
  }

  async getHealth(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getHealth(); } finally { await adapter.disconnect(); }
  }

  async getSystemInfo(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getSystemInfo(); } finally { await adapter.disconnect(); }
  }

  async getStorage(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getStorage(); } finally { await adapter.disconnect(); }
  }

  async getNetwork(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getNetwork(); } finally { await adapter.disconnect(); }
  }

  async getFirmware(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getFirmware(); } finally { await adapter.disconnect(); }
  }

  async getSensors(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getSensors(); } finally { await adapter.disconnect(); }
  }

  async getSel(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getSel(); } finally { await adapter.disconnect(); }
  }

  async getLogs(id: string, tenantId: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { return await adapter.getLogs({ limit: 50 }); } finally { await adapter.disconnect(); }
  }

  async powerAction(id: string, tenantId: string, action: string) {
    const server = await this.findOne(id, tenantId);
    const adapter = this.getAdapterForServer(server);
    await adapter.connect();
    try { await adapter.powerAction(action as any); } finally { await adapter.disconnect(); }
  }
}
