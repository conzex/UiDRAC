/** Local web console — logo, live logs, iDRAC activity table. Copyright (c) 2026 Conzex Global Private Limited */
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { getActivityRows, getLogs, getSnapshot, pushLog, subscribeLogs, type LogEntry } from './agent-state';

const DEFAULT_PORT = 9742;

function resolveConsolePublicDir(): string {
  const candidates = [
    process.env.UIDRAC_AGENT_CONSOLE_DIR,
    path.join(process.cwd(), 'console/public'),
    path.join(__dirname, '..', 'console', 'public'),
    path.join(__dirname, 'console', 'public'),
    '/Library/Application Support/Conzex/UiDRAC Agent/console/public',
  ].filter(Boolean) as string[];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'logo.png'))) return dir;
  }
  return candidates[0] ?? path.join(__dirname, '..', 'console', 'public');
}

function dashboardHtml(uiUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Conzex UiDRAC Agent</title>
  <link rel="icon" href="/favicon.png"/>
  <style>
    :root { --bg:#0f1419; --card:#1a2332; --border:#2d3a4d; --text:#e8eef5; --muted:#8b9cb3; --ok:#22c55e; --bad:#ef4444; --warn:#f59e0b; --accent:#3b82f6; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: var(--bg); color: var(--text); min-height:100vh; }
    header { display:flex; align-items:center; gap:16px; padding:16px 24px; border-bottom:1px solid var(--border); background: var(--card); }
    header img { height:48px; width:auto; }
    header h1 { font-size:1.15rem; font-weight:600; margin:0; }
    header p { margin:4px 0 0; font-size:0.8rem; color: var(--muted); }
    .badge { display:inline-block; padding:4px 10px; border-radius:999px; font-size:0.75rem; font-weight:600; }
    .badge.ok { background: rgba(34,197,94,.15); color: var(--ok); }
    .badge.bad { background: rgba(239,68,68,.15); color: var(--bad); }
    main { padding:20px 24px; max-width:1200px; margin:0 auto; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px; }
    @media (max-width:900px) { .grid { grid-template-columns:1fr; } }
    .card { background: var(--card); border:1px solid var(--border); border-radius:10px; padding:16px; }
    .card h2 { margin:0 0 12px; font-size:0.95rem; }
    .meta { font-size:0.8rem; color: var(--muted); line-height:1.6; }
    .meta code { color: var(--accent); font-size:0.75rem; }
    #logs { height:220px; overflow:auto; font-family: ui-monospace, monospace; font-size:0.72rem; background:#0a0e14; border-radius:8px; padding:10px; border:1px solid var(--border); }
    .log-line { margin:2px 0; }
    .log-line.error { color: #fca5a5; }
    .log-line.warn { color: #fcd34d; }
    table { width:100%; border-collapse: collapse; font-size:0.78rem; }
    th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); }
    th { color: var(--muted); font-weight:600; }
    .res-ok { color: var(--ok); }
    .res-fail { color: var(--bad); }
    .res-pending { color: var(--warn); }
    footer { text-align:center; padding:16px; font-size:0.7rem; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <img src="/logo.png" alt="Conzex"/>
    <div style="flex:1">
      <h1>Conzex UiDRAC Agent</h1>
      <p>Universal iDRAC Console — LAN bridge · Copyright © 2026 Conzex Global Private Limited</p>
    </div>
    <div id="statusBadge" class="badge bad">Connecting…</div>
  </header>
  <main>
    <div class="grid">
      <div class="card">
        <h2>Cloud connection</h2>
        <div class="meta" id="cloudMeta">Loading…</div>
      </div>
      <div class="card">
        <h2>Agent</h2>
        <div class="meta" id="agentMeta">Loading…</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <h2>Live log</h2>
      <div id="logs"></div>
    </div>
    <div class="card">
      <h2>iDRAC activity (realtime)</h2>
      <div style="overflow:auto; max-height:360px">
        <table>
          <thead>
            <tr><th>Time</th><th>Event</th><th>iDRAC IP</th><th>Service tag</th><th>Model</th><th>Health</th><th>Result</th><th>Detail</th></tr>
          </thead>
          <tbody id="activityBody"></tbody>
        </table>
      </div>
    </div>
  </main>
  <footer>Authorized use only with your Conzex tenant · ${uiUrl}</footer>
  <script>
    const logsEl = document.getElementById('logs');
    const bodyEl = document.getElementById('activityBody');
    const badge = document.getElementById('statusBadge');
    function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
    function appendLog(e){
      const d = document.createElement('div');
      d.className = 'log-line ' + (e.level||'info');
      d.textContent = new Date(e.at).toLocaleTimeString() + ' — ' + e.message;
      logsEl.appendChild(d);
      logsEl.scrollTop = logsEl.scrollHeight;
    }
    function renderActivity(rows){
      bodyEl.innerHTML = rows.map(r => {
        const rc = r.result==='ok'?'res-ok':r.result==='fail'?'res-fail':'res-pending';
        return '<tr><td>'+esc(new Date(r.at).toLocaleString())+'</td><td>'+esc(r.event)+'</td><td>'+esc(r.ip)+'</td><td>'+esc(r.serviceTag)+'</td><td>'+esc(r.model)+'</td><td>'+esc(r.health)+'</td><td class="'+rc+'">'+esc(r.result)+'</td><td>'+esc(r.detail)+'</td></tr>';
      }).join('');
    }
    function renderStatus(s){
      const ok = s.cloudConnected && s.authenticated;
      badge.textContent = ok ? 'Connected' : (s.cloudConnected ? 'Auth failed' : 'Disconnected');
      badge.className = 'badge ' + (ok ? 'ok' : 'bad');
      document.getElementById('cloudMeta').innerHTML = 'Cloud URL: <code>'+esc(s.cloudUrl)+'</code><br/>WebSocket: <code>'+esc(s.wsUrl)+'</code><br/>'+(s.lastError ? 'Last error: '+esc(s.lastError) : '');
      document.getElementById('agentMeta').innerHTML = 'Version: <code>'+esc(s.version)+'</code><br/>Tenant: <code>'+esc(s.tenantName || s.tenantId)+'</code><br/>Locked agent ID: <code>'+esc(s.agentId)+'</code><br/>Started: '+esc(new Date(s.startedAt).toLocaleString());
    }
    fetch('/api/snapshot').then(r=>r.json()).then(d=>{ renderStatus(d.snapshot); d.logs.forEach(appendLog); renderActivity(d.activity); });
    const es = new EventSource('/api/logs/stream');
    es.onmessage = ev => { try { appendLog(JSON.parse(ev.data)); } catch(_){} };
    setInterval(()=> fetch('/api/snapshot').then(r=>r.json()).then(d=>{ renderStatus(d.snapshot); renderActivity(d.activity); }), 3000);
  </script>
</body>
</html>`;
}

export function startLocalConsole(port = DEFAULT_PORT): http.Server {
  const publicDir = resolveConsolePublicDir();
  const uiUrl = `http://127.0.0.1:${port}`;

  const server = http.createServer((req, res) => {
    const url = req.url?.split('?')[0] ?? '/';

    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboardHtml(uiUrl));
      return;
    }

    if (url === '/api/snapshot') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          snapshot: getSnapshot(),
          logs: getLogs().slice(-100),
          activity: getActivityRows(),
        }),
      );
      return;
    }

    if (url === '/api/logs/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('\n');
      const send = (entry: LogEntry) => {
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
      };
      getLogs().slice(-50).forEach(send);
      const unsub = subscribeLogs(send);
      req.on('close', () => unsub());
      return;
    }

    const asset = url === '/logo.png' || url === '/favicon.png' ? url.slice(1) : null;
    if (asset) {
      const file = path.join(publicDir, asset);
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        fs.createReadStream(file).pipe(res);
        return;
      }
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    pushLog('error', `Local console failed on port ${port}: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      pushLog('warn', `Try UIDRAC_AGENT_UI_PORT=9743 or stop the process using port ${port}`);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[edge-agent] Local console: http://127.0.0.1:${port}`);
    pushLog('info', `Local console ready: ${uiUrl}`);
  });

  return server;
}

export function maybeOpenBrowser(url: string) {
  if (process.env.UIDRAC_AGENT_OPEN_UI === '0') return;
  if (process.env.UIDRAC_AGENT_UI === '0') return;
  import('child_process').then(({ spawn }) => {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', shell: true }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  }).catch(() => {});
}
