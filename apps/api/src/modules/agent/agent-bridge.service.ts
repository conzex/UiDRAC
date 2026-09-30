/** agent-bridge.service.ts — Route LAN operations to connected tenant agents (keyed by agent publicId). */
import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import type WebSocket from 'ws';
import { UIDRAC_AGENT_NAME } from '@idrac/shared';
import { RedisService } from '../../redis.service';
import { AgentConsoleStore } from './agent-console.store';

const REDIS_ONLINE_AGENT = 'edge-agent:online:agent:';
const REDIS_ONLINE_TENANT = 'edge-agent:online:tenant:';
const ONLINE_TTL_SEC = 45;

export type AgentSocket = WebSocket & { tenantId?: string; publicId?: string };

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class AgentBridgeService {
  private byAgentId = new Map<string, AgentSocket>();
  private byTenant = new Map<string, AgentSocket>();
  private pending = new Map<string, PendingRequest>();

  constructor(
    private redis: RedisService,
    private consoleStore: AgentConsoleStore,
  ) {}

  isAgentSocketOpen(publicId: string): boolean {
    const ws = this.byAgentId.get(publicId);
    return Boolean(ws && ws.readyState === ws.OPEN);
  }

  registerConnection(tenantId: string, publicId: string, ws: AgentSocket) {
    const existing = this.byAgentId.get(publicId);
    if (existing && existing !== ws && existing.readyState === existing.OPEN) {
      existing.close(4000, 'replaced_by_new_connection');
    }
    ws.tenantId = tenantId;
    ws.publicId = publicId;
    this.byAgentId.set(publicId, ws);
    this.byTenant.set(tenantId, ws);
    void this.touchOnline(tenantId, publicId);
  }

  unregisterConnection(ws: AgentSocket) {
    const { tenantId, publicId } = ws;
    if (publicId && this.byAgentId.get(publicId) === ws) {
      this.byAgentId.delete(publicId);
      void this.redis.del(`${REDIS_ONLINE_AGENT}${publicId}`);
    }
    if (tenantId && this.byTenant.get(tenantId) === ws) {
      this.byTenant.delete(tenantId);
      void this.redis.del(`${REDIS_ONLINE_TENANT}${tenantId}`);
    }
  }

  touchOnline(tenantId: string, publicId: string) {
    void this.redis.set(`${REDIS_ONLINE_AGENT}${publicId}`, '1', ONLINE_TTL_SEC);
    void this.redis.set(`${REDIS_ONLINE_TENANT}${tenantId}`, publicId, ONLINE_TTL_SEC);
  }

  disconnectAgent(publicId: string) {
    const ws = this.byAgentId.get(publicId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.close(4004, 'agent_revoked');
    }
    this.byAgentId.delete(publicId);
    void this.redis.del(`${REDIS_ONLINE_AGENT}${publicId}`);
  }

  disconnectTenant(tenantId: string) {
    for (const [id, ws] of this.byAgentId) {
      if (ws.tenantId === tenantId && ws.readyState === ws.OPEN) {
        ws.close(4004, 'credentials_rotated');
      }
      if (ws.tenantId === tenantId) this.byAgentId.delete(id);
    }
    this.byTenant.delete(tenantId);
    void this.redis.del(`${REDIS_ONLINE_TENANT}${tenantId}`);
  }

  async isAgentConnected(publicId: string): Promise<boolean> {
    if (this.isAgentSocketOpen(publicId)) return true;
    const v = await this.redis.get(`${REDIS_ONLINE_AGENT}${publicId}`);
    return Boolean(v);
  }

  async isConnected(tenantId: string): Promise<boolean> {
    for (const ws of this.byAgentId.values()) {
      if (ws.tenantId === tenantId && ws.readyState === ws.OPEN) return true;
    }
    const v = await this.redis.get(`${REDIS_ONLINE_TENANT}${tenantId}`);
    return Boolean(v);
  }

  handleAgentMessage(raw: string, ws: AgentSocket) {
    let msg: {
      id?: string;
      type?: string;
      ok?: boolean;
      data?: unknown;
      error?: string;
      level?: string;
      message?: string;
      at?: string;
    };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'ping' || msg.type === 'heartbeat') {
      if (ws.tenantId && ws.publicId) this.touchOnline(ws.tenantId, ws.publicId);
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (msg.type === 'agent.log' && ws.tenantId) {
      void this.consoleStore.appendLog(ws.tenantId, {
        at: msg.at ?? new Date().toISOString(),
        level: msg.level ?? 'info',
        message: msg.message ?? '',
      });
      return;
    }
    if (msg.type === 'agent.activity' && ws.tenantId) {
      void this.consoleStore.appendActivity(ws.tenantId, msg as Record<string, unknown>);
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
        `Your ${UIDRAC_AGENT_NAME} is not connected. Install and start an agent from Agents → Download Agent.`,
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

  async invokeAdapter<T>(
    tenantId: string,
    payload: {
      generation: string;
      ip: string;
      username: string;
      password: string;
      method: string;
      args?: unknown[];
    },
  ): Promise<T> {
    return this.request<T>(tenantId, 'adapter.invoke', payload);
  }
}
