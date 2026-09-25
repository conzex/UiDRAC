/** agent-bridge.service.ts — In-process routing of LAN operations to connected tenant agents. */
import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import type WebSocket from 'ws';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import { RedisService } from '../../redis.service';

const REDIS_ONLINE_PREFIX = 'edge-agent:online:';
const ONLINE_TTL_SEC = 90;

export type AgentSocket = WebSocket & { tenantId?: string; publicId?: string };

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class AgentBridgeService {
  private byTenant = new Map<string, AgentSocket>();
  private pending = new Map<string, PendingRequest>();

  constructor(private redis: RedisService) {}

  registerConnection(tenantId: string, publicId: string, ws: AgentSocket) {
    const existing = this.byTenant.get(tenantId);
    if (existing && existing !== ws && existing.readyState === existing.OPEN) {
      existing.close(4000, 'replaced_by_new_connection');
    }
    ws.tenantId = tenantId;
    ws.publicId = publicId;
    this.byTenant.set(tenantId, ws);
    void this.redis.set(`${REDIS_ONLINE_PREFIX}${tenantId}`, publicId, ONLINE_TTL_SEC);
  }

  unregisterConnection(ws: AgentSocket) {
    const tenantId = ws.tenantId;
    if (!tenantId) return;
    if (this.byTenant.get(tenantId) === ws) {
      this.byTenant.delete(tenantId);
      void this.redis.del(`${REDIS_ONLINE_PREFIX}${tenantId}`);
    }
  }

  touchOnline(tenantId: string, publicId: string) {
    void this.redis.set(`${REDIS_ONLINE_PREFIX}${tenantId}`, publicId, ONLINE_TTL_SEC);
  }

  async isConnected(tenantId: string): Promise<boolean> {
    const local = this.byTenant.get(tenantId);
    if (local && local.readyState === local.OPEN) return true;
    const v = await this.redis.get(`${REDIS_ONLINE_PREFIX}${tenantId}`);
    return Boolean(v);
  }

  handleAgentMessage(raw: string, ws: AgentSocket) {
    let msg: { id?: string; type?: string; ok?: boolean; data?: unknown; error?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'ping') {
      if (ws.tenantId) this.touchOnline(ws.tenantId, ws.publicId ?? '');
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (!msg.id || !msg.type?.endsWith('.result')) return;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(msg.id);
    if (msg.ok) pending.resolve(msg.data);
    else pending.reject(new Error(msg.error || 'Agent request failed'));
  }

  async request<T>(tenantId: string, type: string, payload: Record<string, unknown>, timeoutMs = 90_000): Promise<T> {
    const ws = this.byTenant.get(tenantId);
    if (!ws || ws.readyState !== ws.OPEN) {
      throw new ServiceUnavailableException(
        `Your ${UIDRAC_AGENT_NAME} is not connected. Download and install it for your organization, then try again.`,
      );
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new BadRequestException(`${UIDRAC_AGENT_NAME} did not respond in time. Check the agent on your LAN.`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });
      ws.send(JSON.stringify({ id, type, payload }));
    });
  }

  async probeViaAgent(tenantId: string, ip: string, username: string, password: string) {
    return this.request<{
      generation: string;
      model?: string;
      serviceTag?: string;
      firmwareVersion?: string;
      health?: string;
    }>(tenantId, 'probe', { ip, username, password });
  }
}
