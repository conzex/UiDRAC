/**
 * Console Gateway — Manages legacy iDRAC 6/7 console containers.
 *
 * Spawns Docker containers with Xvfb + x11vnc + Java viewer,
 * then proxies the VNC stream to the browser via WebSocket.
 */
import express from 'express';
import Dockerode from 'dockerode';
import { WebSocketServer } from 'ws';
import http from 'http';
import { createProxyStream } from './proxy';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/console/ws' });
const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

const CONSOLE_IMAGE = process.env.IDRAC_CONSOLE_IMAGE || 'universal-idrac-console:legacy';
const IDLE_TIMEOUT = parseInt(process.env.CONSOLE_IDLE_TIMEOUT || '1800', 10);
const MAX_PER_TENANT = parseInt(process.env.CONSOLE_MAX_PER_TENANT || '10', 10);

interface ConsoleSession {
  containerId: string;
  vncPort: number;
  createdAt: Date;
  lastActivity: Date;
  tenantId: string;
  serverId: string;
}

const sessions = new Map<string, ConsoleSession>();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

app.post('/spawn', async (req, res) => {
  const { serverId, tenantId, idracHost, idracUser, idracPassword, generation } = req.body;

  if (!serverId || !tenantId || !idracHost || !idracUser || !idracPassword) {
    return res.status(400).json({ error: 'Missing required fields: serverId, tenantId, idracHost, idracUser, idracPassword' });
  }

  const tenantSessions = [...sessions.values()].filter((s) => s.tenantId === tenantId);
  if (tenantSessions.length >= MAX_PER_TENANT) {
    return res.status(429).json({ error: `Maximum ${MAX_PER_TENANT} concurrent console sessions per tenant` });
  }

  const existingKey = `${tenantId}:${serverId}`;
  if (sessions.has(existingKey)) {
    const existing = sessions.get(existingKey)!;
    existing.lastActivity = new Date();
    return res.json({ sessionId: existingKey, vncPort: existing.vncPort });
  }

  try {
    const vncPort = 5900 + sessions.size + 1;

    const container = await docker.createContainer({
      Image: CONSOLE_IMAGE,
      Env: [
        `IDRAC_HOST=${idracHost}`,
        `IDRAC_USER=${idracUser}`,
        `IDRAC_PASSWORD=${idracPassword}`,
        `IDRAC_GENERATION=${generation || '7'}`,
        `VNC_PORT=5900`,
      ],
      ExposedPorts: { '5900/tcp': {} },
      HostConfig: {
        PortBindings: { '5900/tcp': [{ HostPort: String(vncPort) }] },
        CapDrop: ['ALL'],
        ReadonlyRootfs: false,
        SecurityOpt: ['no-new-privileges'],
        Memory: 512 * 1024 * 1024,
        CpuShares: 256,
      },
    });

    await container.start();

    const session: ConsoleSession = {
      containerId: container.id,
      vncPort,
      createdAt: new Date(),
      lastActivity: new Date(),
      tenantId,
      serverId,
    };

    sessions.set(existingKey, session);
    console.log(`[console-gw] Spawned container ${container.id.slice(0, 12)} for ${idracHost} on VNC port ${vncPort}`);

    res.json({ sessionId: existingKey, vncPort, containerId: container.id.slice(0, 12) });
  } catch (err: any) {
    console.error(`[console-gw] Failed to spawn container:`, err.message);
    res.status(500).json({ error: `Failed to spawn console container: ${err.message}` });
  }
});

app.delete('/sessions/:sessionId', async (req, res) => {
  const key = req.params.sessionId;
  const session = sessions.get(key);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    const container = docker.getContainer(session.containerId);
    await container.stop({ t: 5 }).catch(() => {});
    await container.remove({ force: true }).catch(() => {});
    sessions.delete(key);
    console.log(`[console-gw] Removed session ${key}`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sessions', (_req, res) => {
  const list = [...sessions.entries()].map(([id, s]) => ({
    id,
    serverId: s.serverId,
    tenantId: s.tenantId,
    vncPort: s.vncPort,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity,
    containerId: s.containerId.slice(0, 12),
  }));
  res.json(list);
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session');
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    ws.close(4004, 'Session not found');
    return;
  }

  session.lastActivity = new Date();
  createProxyStream(ws, session.vncPort, () => { session.lastActivity = new Date(); });
});

const cleanupInterval = setInterval(async () => {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActivity.getTime() > IDLE_TIMEOUT * 1000) {
      console.log(`[console-gw] Idle timeout for session ${key}`);
      try {
        const container = docker.getContainer(session.containerId);
        await container.stop({ t: 5 }).catch(() => {});
        await container.remove({ force: true }).catch(() => {});
      } catch { /* container may already be gone */ }
      sessions.delete(key);
    }
  }
}, 60_000);

const PORT = parseInt(process.env.PORT || '6080', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️  Console Gateway running on http://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', async () => {
  clearInterval(cleanupInterval);
  for (const [key, session] of sessions) {
    try {
      const container = docker.getContainer(session.containerId);
      await container.stop({ t: 2 }).catch(() => {});
      await container.remove({ force: true }).catch(() => {});
    } catch { /* best-effort cleanup */ }
    sessions.delete(key);
  }
  server.close();
  process.exit(0);
});
