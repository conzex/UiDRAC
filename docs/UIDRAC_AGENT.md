# UiDRAC agent (Conzex cloud)

Universal iDRAC Console is **fully cloud-hosted** by Conzex. Because iDRAC management addresses live on customer LANs, each tenant uses a bound **UiDRAC agent** on Windows, Linux, or macOS.

## Operator flow (in the product)

1. **Settings → UiDRAC agent** — confirm status and download `uidrac-agent-{linux|darwin|win}.json`.
2. **Install** on a host with LAN access to iDRAC (HTTPS, typically port 443) and outbound WSS to your Conzex URL.
3. **Verify Connected** in Settings before **Add Server → Probe**.
4. **Rotate credentials** via Settings if a bundle is compromised—then re-download and restart all agents.

See the in-app **Docs → UiDRAC agent** section for OS-specific commands and troubleshooting.

## Configuration

Agents accept either:

- `UIDRAC_AGENT_CONFIG=/path/to/bundle.json` (preferred), or legacy `IDRAC_AGENT_CONFIG`
- `UIDRAC_AGENT_ID`, `UIDRAC_AGENT_SECRET`, `UIDRAC_CLOUD_URL`, `UIDRAC_AGENT_WS_URL` (legacy `IDRAC_*` names also work)

Bundles include `wsUrl` (e.g. `wss://console.example.com/api/agent/ws`) and are valid for **one tenant only**.

## macOS (LaunchDaemon)

1. Download **`uidrac-agent-darwin.json`** from Settings.
2. Install **`UidracAgent.pkg`** from `{PUBLIC_API_URL}/api/agent/download/macos` (Conzex EULA in installer), **or** build locally: `./scripts/build-edge-agent-macos.sh`
3. Register the system daemon (requires **Node.js 20+** on the Mac):

```bash
sudo "/Library/Application Support/Conzex/UiDRAC Agent/install.sh" \
  --config "$HOME/Downloads/uidrac-agent-darwin.json"
```

Logs: `/Library/Logs/Conzex/uidrac-agent.log` · Label: `com.conzex.uidrac.agent`

**UiDRAC Agent console (all platforms):** Sign in to the portal → **Agents** → select a site connector → **UiDRAC Agent console** for cloud status and **iDRAC activity** (LAN probes from the cloud in realtime).

Uninstall: `sudo "/Library/Application Support/Conzex/UiDRAC Agent/uninstall.sh"`

## Linux / macOS helper (foreground)

```bash
curl -fsSL "$CLOUD_URL/api/agent/install.sh" | bash -s -- --config uidrac-agent-linux.json
```

Requires Node.js 20+ and `npx @idrac/edge-agent` (npm package name; product name is **UiDRAC agent**).

## Windows (service — like Cloudflare Tunnel)

**Recommended:** download **`UidracAgentSetup.exe`** from `{PUBLIC_API_URL}/api/agent/download/setup`. The wizard shows the **Conzex EULA** and **copyright notice**, installs files under `C:\Program Files\Conzex\UiDRAC Agent`, and runs `install.ps1` with your JSON.

**Alternative MSI:** `{PUBLIC_API_URL}/api/agent/download/msi` — WiX installer with legal RTF; after install, run `install.ps1 -Config uidrac-agent-win.json` as Administrator.

Build both on a Windows build machine:

```powershell
pwsh -File scripts/build-edge-agent-installer.ps1
```

Legal text: `apps/edge-agent/installer/legal/CONZEX-EULA.txt`, `COPYRIGHT.txt`, `License.rtf`.

1. Download **`uidrac-agent-win.json`** from Settings.
2. Run **`UidracAgentSetup.exe`** as Administrator (or MSI + script path below).
3. **Verify Connected** in Settings.

Script-only install:

```powershell
Invoke-WebRequest -Uri "https://uidrac.cloud.conzex.com/api/agent/install.ps1" -OutFile install.ps1
powershell -ExecutionPolicy Bypass -File install.ps1 -Config .\uidrac-agent-win.json
```

This registers the **`Conzex UiDRAC Agent`** Windows service (`UiDRACAgent`), copies config to `%ProgramData%\Conzex\UiDRAC\agent.json`, and starts the LAN bridge to **`wss://…/api/agent/ws`**.

Uninstall: `uninstall.ps1` under `C:\Program Files\Conzex\UiDRAC Agent\`.

## API / deployment variables (Conzex operations)

| Variable | Description |
|----------|-------------|
| `REQUIRE_EDGE_AGENT=true` | Probe/add-server must use a connected agent |
| `PUBLIC_API_URL` | Public HTTPS URL embedded in download bundles |
| `AGENT_SIGNING_SECRET` | Enrollment token signing |
| `MASTER_ENCRYPTION_KEY` | Agent secret encryption at rest |

## Tenant isolation

- One agent record per tenant; WebSocket auth binds the connection to that tenant only.
- Cloud routing never accepts a client-supplied tenant id for agent traffic.
