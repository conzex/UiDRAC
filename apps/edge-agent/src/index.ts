#!/usr/bin/env node
/**
 * @idrac/edge-agent — Tenant-bound LAN bridge for Universal iDRAC Console (cloud).
 * Operator UI: portal → Agents → UiDRAC Agent console (per site connector).
 * Copyright (c) 2026 Conzex Global Private Limited
 */
import * as fs from 'fs';
import * as os from 'os';
import WebSocket from 'ws';
import { getAdapter, probeGeneration, runAdapterBatch, type AdapterBatchCall } from '@idrac/adapters';
import type { IdracGeneration } from '@idrac/shared';
import { APP_VERSION, UIDRAC_AGENT_NAME, UIDRAC_AGENT_BUNDLE_SCHEMA, UIDRAC_AGENT_BUNDLE_SCHEMA_LEGACY } from '@idrac/shared';
import {
  initAgentState,
  pushActivity,
  pushLog,
  setAuthenticated,
  setCloudConnected,
  updateActivity,
  setCloudEventRelay,
  relaySnapshotToCloud,
  setLocalLanIp,
} from './agent-state';
import { getPrimaryLanIPv4 } from './local-network';
import { enqueueIdracOp } from './idrac-queue';
import { withPooledIdracAdapter } from './idrac-session-pool';
import {
  closeIdracWsRelay,
  openIdracWsRelay,
  relayIdracHttp,
  sendIdracWsRelay,
} from './idrac-console-relay';

const VERSION = APP_VERSION;

type Endpoint = { cloudUrl: string; wsUrl: string; label: string };

type Config = {
  agentId: string;
  agentSecret: string;
  tenantId?: string;
  tenantName?: string;
  wsUrl?: string;
  cloudUrl?: string;
  endpoints: Endpoint[];
};

const VALID_SCHEMAS = new Set([UIDRAC_AGENT_BUNDLE_SCHEMA, UIDRAC_AGENT_BUNDLE_SCHEMA_LEGACY, 'uidrac-edge-agent/v1']);

function envFirst(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return undefined;
}

function deriveWsUrl(cloudUrl: string): string {
  const base = cloudUrl.replace(/^https/, 'wss').replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/api/agent/ws`;
}

function isLoopbackUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return /localhost|127\.0\.0\.1/.test(url);
  }
}

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:4000';
const DEFAULT_LOCAL_WS = 'ws://127.0.0.1:4000/api/agent/ws';

function loadConfig(): Config {
  const configPath = envFirst('UIDRAC_AGENT_CONFIG', 'IDRAC_AGENT_CONFIG');
  let agentId = '';
  let agentSecret = '';
  let tenantId: string | undefined;
  let tenantName: string | undefined;
  let primaryCloudUrl: string | undefined;
  let primaryWsUrl: string | undefined;
  let localUrl: string | undefined;
  let localWsUrl: string | undefined;
  let enableLocalFallback = true;

  if (configPath && fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, any>;
    if (raw.enableLocalFallback === false) enableLocalFallback = false;
    const schema = raw.schema as string | undefined;
    if (schema && !VALID_SCHEMAS.has(schema)) {
      console.error(`Unsupported agent bundle schema: ${schema}. Download a fresh bundle from Settings → Agent download.`);
      process.exit(1);
    }
    agentId = raw.agentId || raw.UIDRAC_AGENT_ID || raw.IDRAC_AGENT_ID;
    const uniqueAgentId = raw.uniqueAgentId || agentId;
    if (agentId && uniqueAgentId && agentId !== uniqueAgentId) {
      console.error('Invalid bundle: agentId and uniqueAgentId must match (tenant-locked credential).');
      process.exit(1);
    }
    agentSecret = raw.agentSecret || raw.UIDRAC_AGENT_SECRET || raw.IDRAC_AGENT_SECRET;
    tenantId = raw.tenantId;
    tenantName = raw.tenantName;
    primaryCloudUrl = raw.cloudUrl || raw.UIDRAC_CLOUD_URL || raw.IDRAC_CLOUD_URL;
    primaryWsUrl = raw.wsUrl || raw.UIDRAC_AGENT_WS_URL || raw.IDRAC_AGENT_WS_URL;
    localUrl = raw.localUrl;
    localWsUrl = raw.localWsUrl;

    if (Array.isArray(raw.endpoints) && raw.endpoints.length > 0) {
      const parsed: Endpoint[] = raw.endpoints
        .map((e: Record<string, string>) => {
          const cloudUrl = e.cloudUrl || e.cloud;
          if (!cloudUrl) return null;
          const label = e.label || (isLoopbackUrl(cloudUrl) ? 'local' : 'cloud');
          return {
            cloudUrl,
            wsUrl: e.wsUrl || deriveWsUrl(cloudUrl),
            label,
          };
        })
        .filter(Boolean) as Endpoint[];
      if (parsed.length > 0) {
        localUrl = envFirst('UIDRAC_LOCAL_URL') ?? localUrl;
        localWsUrl = envFirst('UIDRAC_LOCAL_WS_URL') ?? localWsUrl;
        const cloudOnly = process.env.UIDRAC_AGENT_CLOUD_ONLY === '1';
        const endpoints = cloudOnly
          ? parsed.filter((e) => e.label !== 'local' && !isLoopbackUrl(e.cloudUrl))
          : parsed;
        if (!cloudOnly && localUrl && !endpoints.some((e) => isLoopbackUrl(e.cloudUrl))) {
          endpoints.unshift({
            cloudUrl: localUrl,
            wsUrl: localWsUrl || deriveWsUrl(localUrl),
            label: 'local',
          });
        }
        return {
          agentId,
          agentSecret,
          tenantId,
          tenantName,
          cloudUrl: primaryCloudUrl,
          wsUrl: primaryWsUrl,
          endpoints: endpoints.length ? endpoints : parsed,
        };
      }
    }
  } else {
    agentId = envFirst('UIDRAC_AGENT_ID', 'IDRAC_AGENT_ID') ?? '';
    agentSecret = envFirst('UIDRAC_AGENT_SECRET', 'IDRAC_AGENT_SECRET') ?? '';
    if (!agentId || !agentSecret) {
      console.error(
        'Set UIDRAC_AGENT_CONFIG (or IDRAC_AGENT_CONFIG) or agent ID + secret env vars (download bundle from dashboard).',
      );
      process.exit(1);
    }
    primaryCloudUrl = envFirst('UIDRAC_CLOUD_URL', 'IDRAC_CLOUD_URL');
    primaryWsUrl = envFirst('UIDRAC_AGENT_WS_URL', 'IDRAC_AGENT_WS_URL');
  }

  // Env-var overrides for local endpoint
  localUrl = envFirst('UIDRAC_LOCAL_URL') ?? localUrl;
  localWsUrl = envFirst('UIDRAC_LOCAL_WS_URL') ?? localWsUrl;

  const cloudOnly = process.env.UIDRAC_AGENT_CLOUD_ONLY === '1';

  if (!cloudOnly && enableLocalFallback && !localUrl && primaryCloudUrl && !isLoopbackUrl(primaryCloudUrl)) {
    localUrl = DEFAULT_LOCAL_URL;
    localWsUrl = DEFAULT_LOCAL_WS;
  }

  // Build ordered endpoint list: local first (fast fail), then cloud
  const endpoints: Endpoint[] = [];

  if (localUrl && !cloudOnly) {
    endpoints.push({
      cloudUrl: localUrl,
      wsUrl: localWsUrl || deriveWsUrl(localUrl),
      label: 'local',
    });
  }

  const cloud = primaryCloudUrl ?? DEFAULT_LOCAL_URL;
  endpoints.push({
    cloudUrl: cloud,
    wsUrl: primaryWsUrl || deriveWsUrl(cloud),
    label: isLoopbackUrl(cloud) ? 'local' : 'cloud',
  });

  return {
    agentId,
    agentSecret,
    tenantId,
    tenantName,
    cloudUrl: primaryCloudUrl,
    wsUrl: primaryWsUrl,
    endpoints,
  };
}

async function runProbe(ip: string, username: string, password: string) {
  let gen: IdracGeneration;
  try {
    gen = await probeGeneration(ip, username, password);
  } catch {
    throw new Error(`Unable to detect iDRAC at ${ip}. Check LAN reachability and credentials.`);
  }
  const adapter = getAdapter(gen, { ip, username, password });
  try {
    await adapter.connect();
    const info = await adapter.getSystemInfo();
    const health = await adapter.getHealth();
    return {
      generation: gen,
      model: info.model,
      serviceTag: info.serviceTag,
      firmwareVersion: info.biosVersion,
      health: health.overall,
    };
  } finally {
    await adapter.disconnect().catch(() => {});
  }
}

let currentEndpointIdx = 0;

function connect(cfg: Config) {
  const ep = cfg.endpoints[currentEndpointIdx];
  const wsUrl = ep.wsUrl;
  let relayBound = false;
  const bindRelay = (ws: WebSocket) => {
    if (relayBound) return;
    relayBound = true;
    setCloudEventRelay((payload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    });
    const pushSnapshot = () => {
      setLocalLanIp(getPrimaryLanIPv4());
      relaySnapshotToCloud();
    };
    pushSnapshot();
    const snapshotTimer = setInterval(pushSnapshot, 15_000);
    ws.on('close', () => clearInterval(snapshotTimer));
  };
  pushLog('info', `Connecting to ${wsUrl} [${ep.label}] (${UIDRAC_AGENT_NAME} v${VERSION})`);
  setCloudConnected(false);
  setAuthenticated(false);

  pushActivity({
    event: 'connect',
    ip: '—',
    serviceTag: '—',
    model: '—',
    generation: '—',
    health: '—',
    result: 'pending',
    detail: `Opening WebSocket to ${ep.label} (${ep.cloudUrl})`,
  });

  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    setCloudConnected(true);
    pushLog('info', 'Cloud socket open — authenticating…');
    ws.send(
      JSON.stringify({
        type: 'auth',
        agentId: cfg.agentId,
        secret: cfg.agentSecret,
        version: VERSION,
        hostname: os.hostname(),
        os: process.platform,
        arch: process.arch,
        hostLanIp: getPrimaryLanIPv4(),
      }),
    );
  });

  ws.on('message', async (data) => {
    let msg: {
      type?: string;
      id?: string;
      tenantId?: string;
      payload?: { ip?: string; username?: string; password?: string };
      reason?: string;
    };
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (msg.type === 'auth.ok') {
      const cloudTenant = msg.tenantId;
      bindRelay(ws);
      if (cfg.tenantId && cloudTenant && cfg.tenantId !== cloudTenant) {
        setAuthenticated(false, 'tenant_mismatch');
        pushLog('error', 'Cloud rejected bundle: tenant ID mismatch. Download Agent bundle from your account only.');
        ws.close();
        return;
      }
      setAuthenticated(true);
      pushLog('info', 'Authenticated — tunnel ready for your organization LAN');
      pushActivity({
        event: 'auth',
        ip: '—',
        serviceTag: '—',
        model: '—',
        generation: '—',
        health: '—',
        result: 'ok',
        detail: 'Cloud authorized this agent',
      });
      return;
    }
    if (msg.type === 'auth.fail') {
      setAuthenticated(false, msg.reason ?? 'auth failed');
      pushLog('error', `Authentication failed: ${msg.reason ?? 'unknown'}`);
      pushActivity({
        event: 'auth',
        ip: '—',
        serviceTag: '—',
        model: '—',
        generation: '—',
        health: '—',
        result: 'fail',
        detail: msg.reason ?? 'invalid credentials',
      });
      ws.close();
      return;
    }
    if (msg.type === 'pong') return;
    if (msg.type === 'console.relay.http' && msg.id && msg.payload) {
      const payload = msg.payload as {
        ip?: string;
        token?: string;
        path?: string;
        method?: string;
        headers?: Record<string, string>;
        bodyBase64?: string;
      };
      const reqId = msg.id;
      if (!payload.ip || !payload.path || !payload.method) {
        ws.send(JSON.stringify({ id: reqId, type: 'console.relay.http.result', ok: false, error: 'invalid_relay_payload' }));
        return;
      }
      void relayIdracHttp({
        ip: payload.ip,
        token: payload.token ?? '',
        path: payload.path,
        method: payload.method,
        headers: payload.headers,
        bodyBase64: payload.bodyBase64,
      })
        .then((data) => {
          ws.send(JSON.stringify({ id: reqId, type: 'console.relay.http.result', ok: true, data }));
        })
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : 'console relay failed';
          ws.send(JSON.stringify({ id: reqId, type: 'console.relay.http.result', ok: false, error: errMsg }));
        });
      return;
    }
    if (msg.type === 'console.ws.open' && msg.id && msg.payload) {
      const payload = msg.payload as { relayId?: string; ip?: string; path?: string; token?: string };
      const reqId = msg.id;
      const relayId = payload.relayId;
      if (!relayId || !payload.ip || !payload.path) {
        ws.send(JSON.stringify({ id: reqId, type: 'console.ws.open.result', ok: false, error: 'invalid_ws_payload' }));
        return;
      }
      try {
        openIdracWsRelay(
          relayId,
          payload.ip,
          payload.path,
          payload.token ?? '',
          () => {
            if (ws.readyState !== ws.OPEN) return;
            ws.send(JSON.stringify({ id: reqId, type: 'console.ws.open.result', ok: true, data: { relayId } }));
          },
          (data, isBinary) => {
            if (ws.readyState !== ws.OPEN) return;
            ws.send(
              JSON.stringify({
                type: 'console.ws.frame',
                relayId,
                data: data.toString('base64'),
                binary: isBinary,
              }),
            );
          },
          (code, reason) => {
            if (ws.readyState !== ws.OPEN) return;
            ws.send(JSON.stringify({ type: 'console.ws.closed', relayId, code, reason }));
          },
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'ws open failed';
        ws.send(JSON.stringify({ id: reqId, type: 'console.ws.open.result', ok: false, error: errMsg }));
      }
      return;
    }
    if (msg.type === 'console.ws.send' && msg.payload) {
      const payload = msg.payload as { relayId?: string; data?: string; binary?: boolean };
      if (payload.relayId && payload.data) {
        sendIdracWsRelay(payload.relayId, Buffer.from(payload.data, 'base64'), Boolean(payload.binary));
      }
      return;
    }
    if (msg.type === 'console.ws.close' && msg.payload) {
      const relayId = (msg.payload as { relayId?: string }).relayId;
      if (relayId) closeIdracWsRelay(relayId);
      return;
    }
    if (msg.type === 'adapter.invoke.batch' && msg.id && msg.payload) {
      const payload = msg.payload as {
        generation?: string;
        ip?: string;
        username?: string;
        password?: string;
        calls?: AdapterBatchCall[];
        parallel?: boolean;
      };
      const { ip, username, password, calls, parallel } = payload;
      const generation = (payload.generation ?? '9') as IdracGeneration;
      const reqId = msg.id;
      if (!ip || !username || !password || !calls?.length) {
        ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.batch.result', ok: false, error: 'invalid_batch_payload' }));
        return;
      }
      const label = calls.map((c) => c.method).join(', ');
      const rowId = pushActivity({
        event: 'invoke',
        ip,
        serviceTag: '…',
        model: 'batch',
        generation: String(generation),
        health: '…',
        result: 'pending',
        detail: `Batch: ${label}`,
      }).id;
      enqueueIdracOp(ip, async () => {
        try {
          const data = await withPooledIdracAdapter(
            generation,
            { ip, username, password },
            async (adapter) => runAdapterBatch(adapter, calls, Boolean(parallel), true),
          );
          updateActivity(rowId, { result: 'ok', detail: `Batch OK (${calls.length})` });
          ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.batch.result', ok: true, data }));
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'adapter batch failed';
          updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
          pushLog('error', `Batch invoke failed ${ip}: ${errMsg}`);
          ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.batch.result', ok: false, error: errMsg }));
        }
      }).catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : 'queue rejected';
        updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
        ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.batch.result', ok: false, error: errMsg }));
      });
      return;
    }
    if (msg.type === 'adapter.invoke' && msg.id && msg.payload) {
      const payload = msg.payload as {
        generation?: string;
        ip?: string;
        username?: string;
        password?: string;
        method?: string;
        args?: unknown[];
      };
      const { ip, username, password, method, args } = payload;
      const generation = (payload.generation ?? '9') as IdracGeneration;
      const reqId = msg.id;
      if (!ip || !username || !password || !method) {
        ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.result', ok: false, error: 'invalid_invoke_payload' }));
        return;
      }
      const rowId = pushActivity({
        event: 'invoke',
        ip,
        serviceTag: '…',
        model: method,
        generation: String(generation),
        health: '…',
        result: 'pending',
        detail: `Adapter ${method}`,
      }).id;
      enqueueIdracOp(ip, async () => {
        try {
          const data = await withPooledIdracAdapter(
            generation,
            { ip, username, password },
            async (adapter) => {
              const target = (adapter as unknown as Record<string, unknown>)[method];
              if (typeof target !== 'function') {
                throw new Error(`Unknown adapter method: ${method}`);
              }
              return (target as (...a: unknown[]) => Promise<unknown>).apply(adapter, args ?? []);
            },
          );
          updateActivity(rowId, { result: 'ok', detail: `${method} OK` });
          ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.result', ok: true, data }));
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'adapter invoke failed';
          updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
          pushLog('error', `Invoke ${method} failed ${ip}: ${errMsg}`);
          ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.result', ok: false, error: errMsg }));
        }
      }).catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : 'queue rejected';
        updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
        ws.send(JSON.stringify({ id: reqId, type: 'adapter.invoke.result', ok: false, error: errMsg }));
      });
      return;
    }
    if (msg.type === 'probe' && msg.id && msg.payload?.ip) {
      const { ip, username, password } = msg.payload;
      const reqId = msg.id;
      const rowId = pushActivity({
        event: 'probe',
        ip,
        serviceTag: '…',
        model: '…',
        generation: '…',
        health: '…',
        result: 'pending',
        detail: 'Probing iDRAC on LAN',
      }).id;
      pushLog('info', `Probe requested for iDRAC ${ip}`);
      enqueueIdracOp(ip, async () => {
        try {
          const result = await runProbe(ip, username!, password!);
          updateActivity(rowId, {
            serviceTag: result.serviceTag ?? '—',
            model: result.model ?? '—',
            generation: result.generation ?? '—',
            health: result.health ?? '—',
            result: 'ok',
            detail: `Firmware ${result.firmwareVersion ?? '—'}`,
          });
          pushLog('info', `Probe OK ${ip} · ${result.serviceTag} · ${result.model} · health ${result.health}`);
          ws.send(JSON.stringify({ id: reqId, type: 'probe.result', ok: true, data: result }));
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'probe failed';
          updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
          pushLog('error', `Probe failed ${ip}: ${errMsg}`);
          ws.send(JSON.stringify({ id: reqId, type: 'probe.result', ok: false, error: errMsg }));
        }
      }).catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : 'queue rejected';
        updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
        ws.send(JSON.stringify({ id: reqId, type: 'probe.result', ok: false, error: errMsg }));
      });
      return;
    }
  });

  ws.on('close', (code) => {
    setCloudEventRelay(null);
    setCloudConnected(false);
    // Cycle to next endpoint on disconnect
    const nextIdx = (currentEndpointIdx + 1) % cfg.endpoints.length;
    const nextEp = cfg.endpoints[nextIdx];
    currentEndpointIdx = nextIdx;
    pushLog('warn', `Disconnected (${code}), trying ${nextEp.label} (${nextEp.cloudUrl}) in 5s…`);
    pushActivity({
      event: 'disconnect',
      ip: '—',
      serviceTag: '—',
      model: '—',
      generation: '—',
      health: '—',
      result: 'fail',
      detail: `WebSocket closed (${code}) — switching to ${nextEp.label}`,
    });
    setTimeout(() => connect(cfg), 5000);
  });

  ws.on('error', (err) => {
    pushLog('error', `Socket error [${ep.label}]: ${err.message}`);
    setCloudConnected(false);
  });

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() }));
    }
  }, 30_000);
}

const cfg = loadConfig();

initAgentState({
  version: VERSION,
  cloudUrl: cfg.endpoints.map((e) => `${e.cloudUrl} [${e.label}]`).join(' | '),
  wsUrl: cfg.endpoints.map((e) => `${e.wsUrl} [${e.label}]`).join(' | '),
  agentId: cfg.agentId,
  tenantId: cfg.tenantId ?? '',
  tenantName: cfg.tenantName ?? '',
  localLanIp: getPrimaryLanIPv4(),
});

pushLog('info', `${UIDRAC_AGENT_NAME} started — endpoints: ${cfg.endpoints.map((e) => `${e.cloudUrl} [${e.label}]`).join(', ')}`);
connect(cfg);
