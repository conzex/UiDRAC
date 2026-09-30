/** agent-bridge.service.ts — Route LAN operations to connected tenant agents (keyed by agent publicId). */
import { Injectable, ServiceUnavailableException, GatewayTimeoutException } from '@nestjs/common';
import { AgentHostIpService } from './agent-host-ip.service';
import WebSocket from 'ws';
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
  private browserConsoleRelays = new Map<string, WebSocket>();

  constructor(
    private redis: RedisService,
    private consoleStore: AgentConsoleStore,
    private hostIp: AgentHostIpService,
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
    return Boolean(this.socketForTenant(tenantId));
  }

  private socketForTenant(tenantId: string): AgentSocket | undefined {
    const primary = this.byTenant.get(tenantId);
    if (primary && primary.readyState === primary.OPEN) return primary;
    for (const ws of this.byAgentId.values()) {
      if (ws.tenantId === tenantId && ws.readyState === ws.OPEN) return ws;
    }
    return undefined;
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
    if (msg.type === 'agent.log' && ws.publicId) {
      void this.consoleStore.appendLog(ws.publicId, {
        at: msg.at ?? new Date().toISOString(),
        level: msg.level ?? 'info',
        message: msg.message ?? '',
      });
      return;
    }
    if (msg.type === 'agent.activity' && ws.publicId) {
      const { type: _t, ...row } = msg as Record<string, unknown>;
      void this.consoleStore.appendActivity(ws.publicId, row);
      return;
    }
    if (msg.type === 'agent.snapshot' && ws.publicId) {
      const data = msg as Record<string, unknown>;
      void this.consoleStore.setSnapshot(ws.publicId, {
        version: String(data.version ?? ''),
        cloudUrl: String(data.cloudUrl ?? ''),
        wsUrl: String(data.wsUrl ?? ''),
        agentId: String(data.agentId ?? ws.publicId),
        tenantId: String(data.tenantId ?? ws.tenantId ?? ''),
        tenantName: String(data.tenantName ?? ''),
        cloudConnected: Boolean(data.cloudConnected),
        authenticated: Boolean(data.authenticated),
        lastError: data.lastError != null ? String(data.lastError) : null,
        startedAt: String(data.startedAt ?? new Date().toISOString()),
        localLanIp: data.localLanIp != null ? String(data.localLanIp) : null,
      });
      if (ws.publicId && data.localLanIp != null) {
        void this.hostIp.record(ws.publicId, String(data.localLanIp));
      }
      return;
    }
    if (msg.type === 'console.ws.frame' && (msg as { relayId?: string }).relayId) {
      const frame = msg as { relayId: string; data?: string; binary?: boolean };
      const browser = this.browserConsoleRelays.get(frame.relayId);
      if (browser && browser.readyState === WebSocket.OPEN && frame.data) {
        browser.send(Buffer.from(frame.data, 'base64'), { binary: Boolean(frame.binary) });
      }
      return;
    }
    if (msg.type === 'console.ws.closed' && (msg as { relayId?: string }).relayId) {
      const closed = msg as { relayId: string; code?: number; reason?: string };
      const browser = this.browserConsoleRelays.get(closed.relayId);
      if (browser && browser.readyState === WebSocket.OPEN) {
        browser.close(closed.code ?? 1000, closed.reason ?? 'idrac_closed');
      }
      this.browserConsoleRelays.delete(closed.relayId);
      return;
    }
    if (msg.type === 'adapter.invoke.batch.result' && msg.id) {
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(msg.id);
      if (msg.ok) pending.resolve(msg.data);
      else pending.reject(new Error(msg.error || 'Agent batch request failed'));
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
    const ws = this.socketForTenant(tenantId);
    if (!ws) {
      throw new ServiceUnavailableException(
        `Your ${UIDRAC_AGENT_NAME} is not connected. Install and start an agent from Agents → Download Agent.`,
      );
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new GatewayTimeoutException(
            `${UIDRAC_AGENT_NAME} did not respond in time. The iDRAC may be busy or another tab is still loading — wait and try again.`,
          ),
        );
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

  attachBrowserConsoleRelay(tenantId: string, relayId: string, browser: WebSocket) {
    this.browserConsoleRelays.set(relayId, browser);
    browser.on('message', (data, isBinary) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      this.sendConsoleWsToAgent(tenantId, relayId, buf, isBinary);
    });
    browser.on('close', () => {
      if (this.browserConsoleRelays.get(relayId) !== browser) return;
      this.browserConsoleRelays.delete(relayId);
      const agent = this.socketForTenant(tenantId);
      if (agent && agent.readyState === WebSocket.OPEN) {
        agent.send(JSON.stringify({ type: 'console.ws.close', payload: { relayId } }));
      }
    });
  }

  sendConsoleWsToAgent(tenantId: string, relayId: string, data: Buffer, binary: boolean) {
    const ws = this.socketForTenant(tenantId);
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(
      JSON.stringify({
        type: 'console.ws.send',
        payload: { relayId, data: data.toString('base64'), binary },
      }),
    );
  }

  async relayConsoleHttp(
    tenantId: string,
    payload: {
      ip: string;
      token: string;
      path: string;
      method: string;
      headers?: Record<string, string>;
      bodyBase64?: string;
    },
  ) {
    return this.request<{
      status: number;
      headers: Record<string, string>;
      bodyBase64: string;
    }>(tenantId, 'console.relay.http', payload, 180_000);
  }

  async openConsoleWsRelay(
    tenantId: string,
    payload: { relayId: string; ip: string; path: string; token: string },
  ) {
    return this.request<{ relayId: string }>(tenantId, 'console.ws.open', payload, 60_000);
  }

  async invokeAdapterBatch<T extends Record<string, unknown>>(
    tenantId: string,
    payload: {
      generation: string;
      ip: string;
      username: string;
      password: string;
      calls: { key: string; method: string; args?: unknown[] }[];
      parallel?: boolean;
    },
    timeoutMs = 95_000,
  ): Promise<T> {
    return this.request<T>(tenantId, 'adapter.invoke.batch', payload, timeoutMs);
  }
}
