/** Redis-backed agent console data (logs + activity from connected agent). */
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis.service';

const LOG_KEY = (tenantId: string) => `agent:console:log:${tenantId}`;
const ACTIVITY_KEY = (tenantId: string) => `agent:console:activity:${tenantId}`;
const MAX = 200;

@Injectable()
export class AgentConsoleStore {
  constructor(private redis: RedisService) {}

  async appendLog(tenantId: string, entry: { at: string; level: string; message: string }) {
    const client = this.redis.client;
    await client.lpush(LOG_KEY(tenantId), JSON.stringify(entry));
    await client.ltrim(LOG_KEY(tenantId), 0, MAX - 1);
  }

  async appendActivity(tenantId: string, row: Record<string, unknown>) {
    const client = this.redis.client;
    await client.lpush(ACTIVITY_KEY(tenantId), JSON.stringify(row));
    await client.ltrim(ACTIVITY_KEY(tenantId), 0, MAX - 1);
  }

  async getConsoleData(tenantId: string) {
    const client = this.redis.client;
    const [logsRaw, activityRaw] = await Promise.all([
      client.lrange(LOG_KEY(tenantId), 0, 99),
      client.lrange(ACTIVITY_KEY(tenantId), 0, 99),
    ]);
    return {
      logs: logsRaw.map((s) => JSON.parse(s)).reverse(),
      activity: activityRaw.map((s) => JSON.parse(s)),
    };
  }
}
