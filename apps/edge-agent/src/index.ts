#!/usr/bin/env node
/**
 * @idrac/edge-agent — Tenant-bound LAN bridge for Universal iDRAC Console (cloud).
 * Probes and manages iDRAC only inside the customer's network; cloud routes requests here.
 */
import * as fs from 'fs';
import WebSocket from 'ws';
import { getAdapter, probeGeneration } from '@idrac/adapters';
import type { IdracGeneration } from '@idrac/shared';

import { APP_VERSION } from '@idrac/shared';

const VERSION = APP_VERSION;

type Config = {
  agentId: string;
  agentSecret: string;
  wsUrl?: string;
  cloudUrl?: string;
};

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
    return {
      agentId: raw.agentId || raw.UIDRAC_AGENT_ID || raw.IDRAC_AGENT_ID,
      agentSecret: raw.agentSecret || raw.UIDRAC_AGENT_SECRET || raw.IDRAC_AGENT_SECRET,
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
  console.log(`[edge-agent] Connecting to ${wsUrl} (v${VERSION})`);
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'auth', agentId: cfg.agentId, secret: cfg.agentSecret, version: VERSION }));
  });

  ws.on('message', async (data) => {
    let msg: { type?: string; id?: string; payload?: { ip?: string; username?: string; password?: string }; reason?: string };
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (msg.type === 'auth.ok') {
      console.log('[edge-agent] Authenticated — tunnel ready for your organization LAN');
      return;
    }
    if (msg.type === 'auth.fail') {
      console.error('[edge-agent] Authentication failed:', msg.reason);
      ws.close();
      return;
    }
    if (msg.type === 'pong') return;
    if (msg.type === 'probe' && msg.id && msg.payload?.ip) {
      const { ip, username, password } = msg.payload;
      try {
        const result = await runProbe(ip, username!, password!);
        ws.send(JSON.stringify({ id: msg.id, type: 'probe.result', ok: true, data: result }));
      } catch (err: any) {
        ws.send(JSON.stringify({ id: msg.id, type: 'probe.result', ok: false, error: err?.message || 'probe failed' }));
      }
    }
  });

  ws.on('close', (code) => {
    console.log(`[edge-agent] Disconnected (${code}), reconnecting in 5s…`);
    setTimeout(() => connect(cfg), 5000);
  });

  ws.on('error', (err) => console.error('[edge-agent] Socket error:', err.message));

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
  }, 30_000);
}

const cfg = loadConfig();
connect(cfg);
