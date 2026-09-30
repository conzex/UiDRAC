import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../packages/db/generated/client';
import { PrismaService } from '../../prisma.service';

export const IDRAC_CACHE_SLICES = {
  dashboard: 'dashboard',
  system: 'system',
  storage: 'storage',
  maintenance: 'maintenance',
  maintenanceDiagnostics: 'maintenance-diagnostics',
  power: 'power',
  configuration: 'configuration',
  idracSettings: 'idrac-settings',
  idracSettingsAdvanced: 'idrac-settings-advanced',
} as const;

export type IdracCacheSlice = (typeof IDRAC_CACHE_SLICES)[keyof typeof IDRAC_CACHE_SLICES];

export type CachedSummaryMeta = { cachedAt: string; fromCache: boolean };

@Injectable()
export class ServerIdracCacheService {
  private inFlight = new Map<string, Promise<Record<string, unknown> & CachedSummaryMeta>>();

  constructor(private prisma: PrismaService) {}

  async read<T extends Record<string, unknown>>(serverId: string, slice: string): Promise<(T & CachedSummaryMeta) | null> {
    const row = await this.prisma.serverIdracCache.findUnique({
      where: { serverId_slice: { serverId, slice } },
    });
    if (!row) return null;
    const payload = row.payload as T;
    return { ...payload, cachedAt: row.syncedAt.toISOString(), fromCache: true };
  }

  async write(serverId: string, slice: string, payload: Record<string, unknown>) {
    const { cachedAt: _c, fromCache: _f, ...rest } = payload;
    const syncedAt = new Date();
    await this.prisma.serverIdracCache.upsert({
      where: { serverId_slice: { serverId, slice } },
      create: { serverId, slice, payload: rest as Prisma.InputJsonValue, syncedAt },
      update: { payload: rest as Prisma.InputJsonValue, syncedAt },
    });
    return syncedAt.toISOString();
  }

  async invalidate(serverId: string, slices?: string[]) {
    if (slices?.length) {
      await this.prisma.serverIdracCache.deleteMany({ where: { serverId, slice: { in: slices } } });
    } else {
      await this.prisma.serverIdracCache.deleteMany({ where: { serverId } });
    }
  }

  /** Return DB cache, or load from iDRAC once (deduped per server+slice). */
  async getOrLoad<T extends Record<string, unknown>>(
    serverId: string,
    slice: string,
    refresh: boolean,
    loader: () => Promise<T>,
  ): Promise<T & CachedSummaryMeta> {
    if (!refresh) {
      const hit = await this.read<T>(serverId, slice);
      if (hit) return hit;
    }

    const key = `${serverId}:${slice}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T & CachedSummaryMeta>;

    const job = (async () => {
      try {
        const data = await loader();
        const cachedAt = await this.write(serverId, slice, data as Record<string, unknown>);
        return { ...data, cachedAt, fromCache: false };
      } catch (err) {
        const stale = await this.read<T>(serverId, slice);
        if (stale) {
          return { ...stale, fromCache: true, stale: true as const };
        }
        throw err;
      }
    })().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, job);
    return job;
  }
}
