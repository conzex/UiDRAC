# Conzex UiDRAC Agent — Production (uidrac.cloud.conzex.com)

This document describes the **Conzex cloud product** agent architecture. Open-source fork documentation uses example domains only — do not copy production URLs into the OSS tree.

## End-to-end flow

1. Customer registers or logs in at `https://uidrac.cloud.conzex.com`
2. Organization receives a unique agent identity (Agent ID + secret) in **Agents → Download Agent**
3. Customer downloads a real ZIP installer (Windows / Linux / macOS) bound to that identity
4. Customer installs on a host inside their LAN (Windows service, Linux systemd, macOS LaunchDaemon)
5. Agent opens a secure WebSocket to `wss://uidrac.cloud.conzex.com/api/agent/ws` and authenticates
6. Dashboard shows accurate status (Connected / Disconnected / Offline / Never connected) from live sockets and heartbeats
7. Customer manages agents (rename, disable, revoke, rotate credentials) under **Agents**

## Production URLs

| Purpose | URL |
|--------|-----|
| Portal | https://uidrac.cloud.conzex.com |
| API | https://uidrac.cloud.conzex.com/api |
| Agent WebSocket | wss://uidrac.cloud.conzex.com/api/agent/ws |
| Windows setup (optional) | https://uidrac.cloud.conzex.com/api/agent/download/setup |
| macOS PKG (optional) | https://uidrac.cloud.conzex.com/api/agent/download/macos |

Agent download bundles embed these URLs when `DEPLOYMENT_MODE=cloud`.

## Building installable packages (release engineering)

Run on a build machine with Node 20+ and pnpm:

```bash
pnpm install
pnpm --filter @idrac/edge-agent run build:mac-exe   # macOS + linux bundle in ZIP
# Windows (on Windows or CI):
# pwsh scripts/build-edge-agent-installer.ps1
# macOS PKG:
# ./scripts/build-edge-agent-macos.sh
```

Run `pnpm agent:cdn-stage` — all publishable OS artifacts go under **`cdn-agent/`** (upload to CDN; API resolves installers from there).

## Organization isolation

Every API route under `/api/agents` validates `Authenticated User → tenantId → agent.id`. Agents cannot be listed or revoked across tenants.

## Local agent console

After install, operators use the portal **UiDRAC Agent console** per site connector (not a local HTTP dashboard on the agent host).
