/** WebSocket upgrade for tunneled iDRAC KVM streams. */
import type { Server } from 'http';
import { ServerConsoleTunnelService } from './server-console-tunnel.service';

export function attachConsoleTunnelWebSocket(server: Server, tunnel: ServerConsoleTunnelService) {
  server.on('upgrade', (req, socket, head) => {
    const path = req.url?.split('?')[0] ?? '';
    const match = /^\/api\/servers\/([^/]+)\/console\/tunnel\/ws/.exec(path);
    if (!match) return;
    const serverId = match[1];
    void tunnel.handleWsUpgrade(serverId, req, socket, head);
  });
}
