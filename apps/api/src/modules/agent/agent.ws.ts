/** agent.ws.ts — WebSocket endpoint for tenant-bound edge agents. */
import type { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { AgentBridgeService, type AgentSocket } from './agent-bridge.service';
import { AgentService } from './agent.service';

export function attachAgentWebSocket(server: Server, bridge: AgentBridgeService, agentService: AgentService) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = req.url?.split('?')[0] ?? '';
    if (url !== '/api/agent/ws') return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: AgentSocket, req) => {
    let authed = false;
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '0.0.0.0';

    ws.on('message', async (data) => {
      const text = data.toString();
      if (!authed) {
        try {
          const msg = JSON.parse(text) as { type?: string; agentId?: string; secret?: string; version?: string };
          if (msg.type !== 'auth' || !msg.agentId || !msg.secret) {
            ws.send(JSON.stringify({ type: 'auth.fail', reason: 'expected_auth' }));
            ws.close(4001, 'auth_required');
            return;
          }
          const record = await agentService.verifyAgentCredentials(msg.agentId, msg.secret);
          if (!record) {
            ws.send(JSON.stringify({ type: 'auth.fail', reason: 'invalid_credentials' }));
            ws.close(4003, 'invalid_credentials');
            return;
          }
          authed = true;
          bridge.registerConnection(record.tenantId, record.publicId, ws);
          await agentService.markConnected(record.publicId, clientIp, msg.version);
          ws.send(JSON.stringify({ type: 'auth.ok', tenantId: record.tenantId }));
        } catch {
          ws.close(4002, 'auth_error');
        }
        return;
      }
      bridge.handleAgentMessage(text, ws);
    });

    ws.on('close', () => bridge.unregisterConnection(ws));
    ws.on('error', () => bridge.unregisterConnection(ws));

    const authTimer = setTimeout(() => {
      if (!authed && ws.readyState === WebSocket.OPEN) {
        ws.close(4001, 'auth_timeout');
      }
    }, 30_000);
    ws.on('close', () => clearTimeout(authTimer));
  });

  console.log('[agent] WebSocket listening on /api/agent/ws');
}
