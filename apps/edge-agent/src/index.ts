#!/usr/bin/env node
/**
 * @idrac/edge-agent — Tenant-bound LAN bridge for Universal iDRAC Console (cloud).
 * Local console: http://127.0.0.1:9742 (logo, live logs, iDRAC activity table)
 * Copyright (c) 2026 Conzex Global Private Limited
 */
import * as fs from 'fs';
import * as os from 'os';
import WebSocket from 'ws';
import { getAdapter, probeGeneration } from '@idrac/adapters';
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
} from './agent-state';
import { maybeOpenBrowser, startLocalConsole } from './local-console';

const VERSION = APP_VERSION;
const UI_PORT = parseInt(process.env.UIDRAC_AGENT_UI_PORT ?? '9742', 10);

type Config = {
  agentId: string;
  agentSecret: string;
  tenantId?: string;
  tenantName?: string;
  wsUrl?: string;
  cloudUrl?: string;
};

const VALID_SCHEMAS = new Set([UIDRAC_AGENT_BUNDLE_SCHEMA, UIDRAC_AGENT_BUNDLE_SCHEMA_LEGACY, 'uidrac-edge-agent/v1']);

function envFirst(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return undefined;
}

function loadConfig(): Config {
  const configPath = envFirst('UIDRAC_AGENT_CONFIG', 'IDRAC_AGENT_CONFIG');
  if (configPath && fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, string>;
    const schema = raw.schema as string | undefined;
    if (schema && !VALID_SCHEMAS.has(schema)) {
      console.error(`Unsupported agent bundle schema: ${schema}. Download a fresh bundle from Settings → Agent download.`);
      process.exit(1);
    }
    const agentId = raw.agentId || raw.UIDRAC_AGENT_ID || raw.IDRAC_AGENT_ID;
    const uniqueAgentId = raw.uniqueAgentId || agentId;
    if (agentId && uniqueAgentId && agentId !== uniqueAgentId) {
      console.error('Invalid bundle: agentId and uniqueAgentId must match (tenant-locked credential).');
      process.exit(1);
    }
    return {
      agentId,
      agentSecret: raw.agentSecret || raw.UIDRAC_AGENT_SECRET || raw.IDRAC_AGENT_SECRET,
      tenantId: raw.tenantId,
      tenantName: raw.tenantName,
      wsUrl: raw.wsUrl || raw.UIDRAC_AGENT_WS_URL || raw.IDRAC_AGENT_WS_URL,
      cloudUrl: raw.cloudUrl || raw.UIDRAC_CLOUD_URL || raw.IDRAC_CLOUD_URL,
    };
  }
  const agentId = envFirst('UIDRAC_AGENT_ID', 'IDRAC_AGENT_ID');
  const agentSecret = envFirst('UIDRAC_AGENT_SECRET', 'IDRAC_AGENT_SECRET');
  if (!agentId || !agentSecret) {
    console.error(
      'Set UIDRAC_AGENT_CONFIG (or IDRAC_AGENT_CONFIG) or agent ID + secret env vars (download bundle from dashboard).',
    );
    process.exit(1);
  }
  let wsUrl = envFirst('UIDRAC_AGENT_WS_URL', 'IDRAC_AGENT_WS_URL');
  const cloudUrl = envFirst('UIDRAC_CLOUD_URL', 'IDRAC_CLOUD_URL') ?? 'http://localhost:4000';
  if (!wsUrl) wsUrl = cloudUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/agent/ws';
  return { agentId, agentSecret, wsUrl, cloudUrl };
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

function connect(cfg: Config) {
  const wsUrl = cfg.wsUrl!;
  let relayBound = false;
  const bindRelay = (ws: WebSocket) => {
    if (relayBound) return;
    relayBound = true;
    setCloudEventRelay((payload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    });
  };
  pushLog('info', `Connecting to ${wsUrl} (${UIDRAC_AGENT_NAME} v${VERSION})`);
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
    detail: `Opening WebSocket to cloud`,
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
    if (msg.type === 'probe' && msg.id && msg.payload?.ip) {
      const { ip, username, password } = msg.payload;
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
        ws.send(JSON.stringify({ id: msg.id, type: 'probe.result', ok: true, data: result }));
      } catch (err: any) {
        const errMsg = err?.message || 'probe failed';
        updateActivity(rowId, { result: 'fail', detail: errMsg, health: '—' });
        pushLog('error', `Probe failed ${ip}: ${errMsg}`);
        ws.send(JSON.stringify({ id: msg.id, type: 'probe.result', ok: false, error: errMsg }));
      }
    }
  });

  ws.on('close', (code) => {
    setCloudEventRelay(null);
    setCloudConnected(false);
    pushLog('warn', `Disconnected (${code}), reconnecting in 5s…`);
    pushActivity({
      event: 'disconnect',
      ip: '—',
      serviceTag: '—',
      model: '—',
      generation: '—',
      health: '—',
      result: 'fail',
      detail: `WebSocket closed (${code})`,
    });
    setTimeout(() => connect(cfg), 5000);
  });

  ws.on('error', (err) => {
    pushLog('error', `Socket error: ${err.message}`);
    setCloudConnected(false);
  });

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() }));
    }
  }, 30_000);
}

const cfg = loadConfig();
const uiUrl = `http://127.0.0.1:${UI_PORT}`;

initAgentState({
  version: VERSION,
  cloudUrl: cfg.cloudUrl ?? '',
  wsUrl: cfg.wsUrl ?? '',
  agentId: cfg.agentId,
  tenantId: cfg.tenantId ?? '',
  tenantName: cfg.tenantName ?? '',
  uiUrl,
});

if (process.env.UIDRAC_AGENT_UI !== '0') {
  startLocalConsole(UI_PORT);
  if (process.stdin.isTTY || process.env.UIDRAC_AGENT_OPEN_UI === '1') {
    setTimeout(() => maybeOpenBrowser(`http://127.0.0.1:${UI_PORT}`), 800);
  }
} else {
  console.log('[edge-agent] Local console disabled (UIDRAC_AGENT_UI=0). Set UIDRAC_AGENT_UI=1 to enable http://127.0.0.1:9742');
}

pushLog('info', `${UIDRAC_AGENT_NAME} started — open ${uiUrl} for live logs and iDRAC activity`);
connect(cfg);
