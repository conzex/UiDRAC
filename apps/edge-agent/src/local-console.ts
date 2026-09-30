/** Optional local HTTP UI (disabled by default — use portal Agents → console). */
import * as http from 'http';
import { pushLog } from './agent-state';
import { CONZEX_COPYRIGHT_LINE, UIDRAC_AGENT_CONSOLE_TAGLINE, UIDRAC_AGENT_NAME } from '@idrac/shared';

const DEFAULT_PORT = 9742;

function portalOnlyHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${UIDRAC_AGENT_NAME}</title>
  <style>
    body { margin:0; font-family: system-ui, sans-serif; background:#f4f6f8; color:#1a1a1a; min-height:100vh; display:flex; flex-direction:column; }
    main { flex:1; max-width:32rem; margin:auto; padding:2rem 1.5rem; text-align:center; }
    h1 { font-size:1.25rem; margin:0 0 0.5rem; }
    p { font-size:0.9rem; color:#5c6b7a; line-height:1.5; }
    footer { font-size:0.7rem; color:#8b9cb3; padding:1rem; text-align:center; border-top:1px solid #dde3ea; }
  </style>
</head>
<body>
  <main>
    <h1>${UIDRAC_AGENT_NAME}</h1>
    <p>${UIDRAC_AGENT_CONSOLE_TAGLINE}</p>
    <p style="margin-top:1.25rem">Live logs and iDRAC activity are available in the <strong>portal only</strong> — open <strong>Agents</strong>, select this site connector, and use the agent console.</p>
  </main>
  <footer>${CONZEX_COPYRIGHT_LINE}</footer>
</body>
</html>`;
}

export function startLocalConsole(port = DEFAULT_PORT): http.Server {
  const server = http.createServer((req, res) => {
    const url = req.url?.split('?')[0] ?? '/';
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(portalOnlyHtml());
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    pushLog('error', `Local console failed on port ${port}: ${err.message}`);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[edge-agent] Local stub (portal-only): http://127.0.0.1:${port}`);
  });

  return server;
}

export function maybeOpenBrowser(_url: string) {
  /* Portal-only: do not open a local dashboard in the browser. */
}
