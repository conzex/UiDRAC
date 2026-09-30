/** Redis-backed agent console data (logs + activity + snapshot), keyed by agent publicId. */
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis.service';

const LOG_KEY = (publicId: string) => `agent:console:log:${publicId}`;
const ACTIVITY_KEY = (publicId: string) => `agent:console:activity:${publicId}`;
const SNAPSHOT_KEY = (publicId: string) => `agent:console:snapshot:${publicId}`;
const MAX = 200;
const SNAPSHOT_TTL_SEC = 120;

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
};

@Injectable()
export class AgentConsoleStore {
  constructor(private redis: RedisService) {}

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

  async getConsoleData(publicId: string) {
    const client = this.redis.client;
    const [logsRaw, activityRaw, snapshotRaw] = await Promise.all([
      client.lrange(LOG_KEY(publicId), 0, 99),
      client.lrange(ACTIVITY_KEY(publicId), 0, 99),
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
    return {
      snapshot,
      logs: logsRaw.map((s) => JSON.parse(s)).reverse(),
      activity: activityRaw.map((s) => JSON.parse(s)),
    };
  }

  async clearAgent(publicId: string) {
    await Promise.all([
      this.redis.del(LOG_KEY(publicId)),
      this.redis.del(ACTIVITY_KEY(publicId)),
      this.redis.del(SNAPSHOT_KEY(publicId)),
    ]);
  }
}
