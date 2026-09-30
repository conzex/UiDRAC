/** Agent-tunneled iDRAC HTML5 console (browser cannot reach private iDRAC IPs). */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import WebSocket from 'ws';
import { RedisService } from '../../redis.service';
import { AgentBridgeService } from '../agent/agent-bridge.service';

const CFG_KEY = (serverId: string) => `idrac:console:tunnel:cfg:${serverId}`;
const TICKET_KEY = (ticket: string) => `idrac:console:tunnel:ticket:${ticket}`;
const TICKET_TTL_SEC = 4 * 60 * 60;
const COOKIE_PREFIX = 'uidrac_ct_';

type TunnelCfg = {
  ip: string;
  token: string;
  agentTenantId: string;
};

export type ConsoleTunnelSession = {
  ticket: string;
  url: string;
};

@Injectable()
export class ServerConsoleTunnelService {
  constructor(
    private redis: RedisService,
    private agentBridge: AgentBridgeService,
  ) {}

  extractIdracToken(consoleUrl: string): string {
    const hash = consoleUrl.split('#')[1];
    if (!hash) return '';
    try {
      return decodeURIComponent(hash);
    } catch {
      return hash;
    }
  }

  async storeTunnelConfig(serverId: string, cfg: TunnelCfg) {
    await this.redis.set(CFG_KEY(serverId), JSON.stringify(cfg), TICKET_TTL_SEC);
  }

  async createTunnelSession(serverId: string, idracConsoleUrl: string): Promise<ConsoleTunnelSession> {
    const token = this.extractIdracToken(idracConsoleUrl);
    const ticket = randomBytes(24).toString('hex');
    await this.redis.set(TICKET_KEY(ticket), serverId, TICKET_TTL_SEC);
    const hash = token ? `#${encodeURIComponent(token)}` : '';
    const url = `/api/servers/${serverId}/console/tunnel/restgui/start.html?t=${ticket}${hash}`;
    return { ticket, url };
  }

  private async resolveCfg(serverId: string): Promise<TunnelCfg> {
    const raw = await this.redis.get(CFG_KEY(serverId));
    if (!raw) throw new NotFoundException('Console tunnel expired. Reopen the Console tab.');
    return JSON.parse(raw) as TunnelCfg;
  }

  private async assertTunnelAccess(serverId: string, req: Request, res: Response): Promise<TunnelCfg> {
    const cookieName = `${COOKIE_PREFIX}${serverId}`;
    let ticket = (req.query.t as string) || req.cookies?.[cookieName];
    if (!ticket) throw new UnauthorizedException('Console tunnel access denied.');

    const boundServer = await this.redis.get(TICKET_KEY(ticket));
    if (!boundServer || boundServer !== serverId) {
      throw new ForbiddenException('Invalid or expired console ticket.');
    }

    if (req.query.t && !req.cookies?.[cookieName]) {
      res.cookie(cookieName, ticket, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: TICKET_TTL_SEC * 1000,
        path: `/api/servers/${serverId}/console/tunnel`,
      });
    }

    return this.resolveCfg(serverId);
  }

  private rewriteBody(
    body: Buffer,
    contentType: string,
    ip: string,
    serverId: string,
    req: Request,
  ): Buffer {
    if (!/text\/|javascript|json|xml|html|svg/i.test(contentType)) return body;
    const host = req.get('host') ?? 'localhost';
    const proto = req.get('x-forwarded-proto') === 'https' || req.secure ? 'https' : 'http';
    const wsProto = proto === 'https' ? 'wss' : 'ws';
    const httpBase = `${proto}://${host}/api/servers/${serverId}/console/tunnel`;
    const wsBase = `${wsProto}://${host}/api/servers/${serverId}/console/tunnel/ws`;
    const esc = ip.replace(/\./g, '\\.');
    let text = body.toString('utf8');
    text = text.replace(new RegExp(`https://${esc}`, 'gi'), httpBase);
    text = text.replace(new RegExp(`http://${esc}`, 'gi'), httpBase);
    text = text.replace(new RegExp(`wss://${esc}`, 'gi'), wsBase);
    text = text.replace(new RegExp(`ws://${esc}`, 'gi'), wsBase);
    return Buffer.from(text, 'utf8');
  }

  async handleHttp(serverId: string, req: Request, res: Response) {
    const cfg = await this.assertTunnelAccess(serverId, req, res);
    const prefix = `/api/servers/${serverId}/console/tunnel`;
    const url = new URL(req.originalUrl, 'http://local');
    const pathWithQuery = url.pathname.replace(prefix, '') || '/';
    const pathOnly = pathWithQuery.split('?')[0];
    const idracQuery = new URLSearchParams(url.search);
    idracQuery.delete('t');
    const qs = idracQuery.toString();
    const idracPath = qs ? `${pathOnly}?${qs}` : pathOnly;

    const bodyChunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c) => bodyChunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const bodyBase64 = bodyChunks.length ? Buffer.concat(bodyChunks).toString('base64') : undefined;

    const forwardHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') forwardHeaders[k] = v;
    }

    const relay = await this.agentBridge.relayConsoleHttp(cfg.agentTenantId, {
      ip: cfg.ip,
      token: cfg.token,
      path: idracPath,
      method: req.method,
      headers: forwardHeaders,
      bodyBase64,
    });

    const raw = Buffer.from(relay.bodyBase64, 'base64');
    const contentType = relay.headers['content-type'] ?? relay.headers['Content-Type'] ?? 'application/octet-stream';
    const out = this.rewriteBody(raw, contentType, cfg.ip, serverId, req);

    for (const [k, v] of Object.entries(relay.headers)) {
      const lower = k.toLowerCase();
      if (lower === 'content-length' || lower === 'content-security-policy' || lower === 'x-frame-options') continue;
      res.setHeader(k, v);
    }
    res.status(relay.status);
    res.setHeader('content-length', String(out.length));
    res.send(out);
  }

  async handleWsUpgrade(
    serverId: string,
    req: import('http').IncomingMessage,
    socket: import('stream').Duplex,
    head: Buffer,
  ) {
    const cfg = await this.resolveCfg(serverId);
    const ticket =
      new URL(req.url ?? '', 'http://x').searchParams.get('t') ??
      (req.headers.cookie?.match(new RegExp(`${COOKIE_PREFIX}${serverId}=([^;]+)`))?.[1]);
    if (!ticket) {
      socket.destroy();
      return;
    }
    const boundServer = await this.redis.get(TICKET_KEY(ticket));
    if (boundServer !== serverId) {
      socket.destroy();
      return;
    }

    const url = new URL(req.url ?? '', 'http://local');
    const prefix = `/api/servers/${serverId}/console/tunnel/ws`;
    const idracPath = url.pathname.replace(prefix, '') || '/';

    const relayId = randomBytes(16).toString('hex');
    const wss = new WebSocket.Server({ noServer: true });
    wss.handleUpgrade(req, socket, head, async (browser) => {
      try {
        await this.agentBridge.openConsoleWsRelay(cfg.agentTenantId, {
          relayId,
          ip: cfg.ip,
          path: idracPath,
          token: cfg.token,
        });
        this.agentBridge.attachBrowserConsoleRelay(cfg.agentTenantId, relayId, browser);
      } catch {
        browser.close(1011, 'relay_failed');
      }
    });
  }
}
