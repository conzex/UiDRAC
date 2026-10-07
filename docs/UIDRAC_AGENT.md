# UiDRAC agent (Conzex cloud)

Universal iDRAC Console is **fully cloud-hosted** by Conzex. iDRAC management addresses sit on your LAN, so each organisation runs a **UiDRAC agent** on Windows, Linux, or macOS inside that network.

## Operator flow

1. **Agents** → register or select your site connector.
2. Download **credentials.json** from the portal (tenant secret — not on CDN).
3. Download the **OS installer** from the same page (links point to CDN).
4. Run the install commands for your OS (below or **Agents → Manual / Terminal**).
5. Confirm **Connected**, then **Add Server → Probe**.

## Files to host on CDN (public)

Upload to `https://cdn.conzex.com/uidrac/agent/` (or set `AGENT_CDN_BASE_URL`):

| File | Purpose |
|------|---------|
| `UidracAgent.pkg` | macOS installer |
| `UidracAgentSetup.exe` | Windows installer |
| `UidracAgent-linux.sh` | Linux installer |
| `agent-bundle.cjs` | Linux runtime (downloaded by linux script) |
| `uidrac-agent.service` | Linux systemd unit (downloaded by linux script) |

**Do not** publish `credentials.json` on CDN.

Build locally: `pnpm agent:cdn-stage` → upload `cdn-agent/`. Verify: `pnpm agent:cdn-verify`.

## Install commands (after credentials.json from portal)

Base CDN URL: `https://cdn.conzex.com/uidrac/agent`

### macOS

```bash
curl -fsSL -o UidracAgent.pkg "https://cdn.conzex.com/uidrac/agent/UidracAgent.pkg"
sudo installer -pkg UidracAgent.pkg -target /
sudo "/Library/Application Support/Conzex/UiDRAC Agent/install.sh" --config "$(pwd)/credentials.json"
```

### Windows (PowerShell as Administrator)

```powershell
curl.exe -fsSL -o UidracAgentSetup.exe "https://cdn.conzex.com/uidrac/agent/UidracAgentSetup.exe"
Start-Process -Wait -FilePath ".\UidracAgentSetup.exe"
powershell -ExecutionPolicy Bypass -File "$env:ProgramFiles\Conzex\UiDRAC Agent\install.ps1" -Config "$(pwd)\credentials.json"
```

### Linux (Node.js 20+)

```bash
curl -fsSL -o UidracAgent-linux.sh "https://cdn.conzex.com/uidrac/agent/UidracAgent-linux.sh"
chmod +x UidracAgent-linux.sh
sudo ./UidracAgent-linux.sh --config "$(pwd)/credentials.json"
```

## Virtual console (cloud)

HTML5 console (iDRAC 8/9) runs in the portal; traffic is carried via your site agent. Legacy 6/7 use the hosted noVNC path.

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Disconnected | Outbound HTTPS/WSS; agent service running; fresh credentials after rotation |
| Probe fails | Agent host reaches iDRAC HTTPS (port 443) |
| Linux install fails | CDN has `agent-bundle.cjs` and `uidrac-agent.service`; run `pnpm agent:cdn-verify` |

## Engineering

Licensed Docker SaaS: [SAAS-DOCKER.md](SAAS-DOCKER.md). CDN layout: [../apps/edge-agent/installer/CDN-PORTAL-FILES.md](../apps/edge-agent/installer/CDN-PORTAL-FILES.md).
