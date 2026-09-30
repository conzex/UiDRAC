/** Relay iDRAC HTML5 console HTTP/WebSocket from the agent LAN hop. */
import * as https from 'https';
import WebSocket from 'ws';
import { createHttpClient } from '@idrac/adapters';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

export type IdracHttpRelayResult = {
  status: number;
  headers: Record<string, string>;
  bodyBase64: string;
};

export async function relayIdracHttp(opts: {
  ip: string;
  token: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
  bodyBase64?: string;
}): Promise<IdracHttpRelayResult> {
  const client = createHttpClient(opts.ip, 180_000);
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  for (const k of Object.keys(headers)) {
    if (HOP_HEADERS.has(k.toLowerCase())) delete headers[k];
  }
  if (opts.token) headers['X-Auth-Token'] = opts.token;

  const body = opts.bodyBase64 ? Buffer.from(opts.bodyBase64, 'base64') : undefined;
  const res = await client.request({
    method: opts.method,
    url: opts.path.startsWith('/') ? opts.path : `/${opts.path}`,
    headers,
    data: body,
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  const outHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(res.headers)) {
    if (v == null || HOP_HEADERS.has(k.toLowerCase())) continue;
    outHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
  }

  return {
    status: res.status,
    headers: outHeaders,
    bodyBase64: Buffer.from(res.data).toString('base64'),
  };
}

type RelaySocket = {
  idrac: WebSocket;
};

const wsRelays = new Map<string, RelaySocket>();

export function openIdracWsRelay(
  relayId: string,
  ip: string,
  path: string,
  token: string,
  onOpen: () => void,
  onFrame: (data: Buffer, isBinary: boolean) => void,
  onClose: (code: number, reason: string) => void,
): void {
  closeIdracWsRelay(relayId);
  const url = `wss://${ip}${path.startsWith('/') ? path : `/${path}`}`;
  const idrac = new WebSocket(url, {
    agent: httpsAgent,
    headers: token ? { 'X-Auth-Token': token } : undefined,
    rejectUnauthorized: false,
  });
  wsRelays.set(relayId, { idrac });

  idrac.on('open', () => onOpen());
  idrac.on('message', (data, isBinary) => {
    onFrame(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer), isBinary);
  });
  idrac.on('close', (code, reason) => {
    wsRelays.delete(relayId);
    onClose(code, reason.toString());
  });
  idrac.on('error', () => {
    wsRelays.delete(relayId);
    onClose(1011, 'idrac_ws_error');
  });
}

export function sendIdracWsRelay(relayId: string, data: Buffer, isBinary: boolean) {
  const relay = wsRelays.get(relayId);
  if (!relay || relay.idrac.readyState !== WebSocket.OPEN) return;
  relay.idrac.send(data, { binary: isBinary });
}

export function closeIdracWsRelay(relayId: string) {
  const relay = wsRelays.get(relayId);
  if (!relay) return;
  wsRelays.delete(relayId);
  try {
    relay.idrac.close();
  } catch {
    /* ignore */
  }
}
