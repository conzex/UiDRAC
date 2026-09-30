/** Redis-backed agent console data (logs + activity + snapshot), keyed by agent publicId. */
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis.service';

const LOG_KEY = (publicId: string) => `agent:console:log:${publicId}`;
const ACTIVITY_KEY = (publicId: string) => `agent:console:activity:${publicId}`;
const SNAPSHOT_KEY = (publicId: string) => `agent:console:snapshot:${publicId}`;
const MAX = 200;
const SNAPSHOT_TTL_SEC = 120;
const MEM_TTL_MS = 2_500;

export type AgentConsoleSnapshot = {
  version: string;
  cloudUrl: string;
  wsUrl: string;
  agentId: string;
  tenantId: string;
  tenantName: string;
  cloudConnected: boolean;
  authenticated: boolean;
  lastError: string | null;
  startedAt: string;
  localLanIp?: string | null;
};

type MemEntry = { at: number; payload: unknown };

@Injectable()
export class AgentConsoleStore {
  private mem = new Map<string, MemEntry>();

  constructor(private redis: RedisService) {}

  private memGet<T>(key: string): T | null {
    const row = this.mem.get(key);
    if (!row || Date.now() - row.at > MEM_TTL_MS) return null;
    return row.payload as T;
  }

  private memSet(key: string, payload: unknown) {
    this.mem.set(key, { at: Date.now(), payload });
  }

  async appendLog(publicId: string, entry: { at: string; level: string; message: string }) {
    const client = this.redis.client;
    await client.lpush(LOG_KEY(publicId), JSON.stringify(entry));
    await client.ltrim(LOG_KEY(publicId), 0, MAX - 1);
  }

  async appendActivity(publicId: string, row: Record<string, unknown>) {
    const client = this.redis.client;
    await client.lpush(ACTIVITY_KEY(publicId), JSON.stringify(row));
    await client.ltrim(ACTIVITY_KEY(publicId), 0, MAX - 1);
  }

  async setSnapshot(publicId: string, snapshot: AgentConsoleSnapshot) {
    await this.redis.set(SNAPSHOT_KEY(publicId), JSON.stringify(snapshot), SNAPSHOT_TTL_SEC);
  }

  async getSnapshot(publicId: string): Promise<AgentConsoleSnapshot | null> {
    const cacheKey = `snap:${publicId}`;
    const hit = this.memGet<AgentConsoleSnapshot | null>(cacheKey);
    if (hit !== null) return hit;
    const snapshotRaw = await this.redis.client.get(SNAPSHOT_KEY(publicId));
    let snapshot: AgentConsoleSnapshot | null = null;
    if (snapshotRaw) {
      try {
        snapshot = JSON.parse(snapshotRaw) as AgentConsoleSnapshot;
      } catch {
        snapshot = null;
      }
    }
    this.memSet(cacheKey, snapshot);
    return snapshot;
  }

  async getActivity(publicId: string, limit = 50): Promise<Record<string, unknown>[]> {
    const cacheKey = `act:${publicId}:${limit}`;
    const hit = this.memGet<Record<string, unknown>[]>(cacheKey);
    if (hit) return hit;
    const activityRaw = await this.redis.client.lrange(ACTIVITY_KEY(publicId), 0, limit - 1);
    const activity = activityRaw.map((s) => JSON.parse(s) as Record<string, unknown>);
    this.memSet(cacheKey, activity);
    return activity;
  }

  async getConsoleData(publicId: string) {
    const cacheKey = `full:${publicId}`;
    const hit = this.memGet<{
      snapshot: AgentConsoleSnapshot | null;
      logs: unknown[];
      activity: unknown[];
    }>(cacheKey);
    if (hit) return hit;

    const client = this.redis.client;
    const [logsRaw, activityRaw, snapshotRaw] = await Promise.all([
      client.lrange(LOG_KEY(publicId), 0, 49),
      client.lrange(ACTIVITY_KEY(publicId), 0, 49),
      client.get(SNAPSHOT_KEY(publicId)),
    ]);
    let snapshot: AgentConsoleSnapshot | null = null;
    if (snapshotRaw) {
      try {
        snapshot = JSON.parse(snapshotRaw) as AgentConsoleSnapshot;
      } catch {
        snapshot = null;
      }
    }
    const payload = {
      snapshot,
      logs: logsRaw.map((s) => JSON.parse(s)).reverse(),
      activity: activityRaw.map((s) => JSON.parse(s)),
    };
    this.memSet(cacheKey, payload);
    return payload;
  }

  async clearAgent(publicId: string) {
    await Promise.all([
      this.redis.del(LOG_KEY(publicId)),
      this.redis.del(ACTIVITY_KEY(publicId)),
      this.redis.del(SNAPSHOT_KEY(publicId)),
    ]);
  }
}
