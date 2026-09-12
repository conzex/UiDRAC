/**
 * proxy.ts — WebSocket-to-TCP proxy for VNC streams.
 * Connects browser WebSocket to the container's VNC port.
 */
import net from 'net';
import type { WebSocket } from 'ws';

export function createProxyStream(ws: WebSocket, vncPort: number, onActivity: () => void): void {
  const tcp = net.createConnection({ host: '127.0.0.1', port: vncPort }, () => {
    console.log(`[proxy] Connected to VNC on port ${vncPort}`);
  });

  tcp.on('data', (data) => {
    onActivity();
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });

  ws.on('message', (data) => {
    onActivity();
    if (!tcp.destroyed) {
      tcp.write(data as Buffer);
    }
  });

  tcp.on('error', (err) => {
    console.error(`[proxy] TCP error on port ${vncPort}:`, err.message);
    ws.close(4500, 'VNC connection error');
  });

  tcp.on('close', () => {
    ws.close(4501, 'VNC connection closed');
  });

  ws.on('close', () => {
    tcp.destroy();
  });

  ws.on('error', () => {
    tcp.destroy();
  });
}
