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

## Linux / macOS helper

```bash
curl -fsSL "$CLOUD_URL/api/agent/install.sh" | bash -s -- --config uidrac-agent-linux.json
```

Requires Node.js 20+ and `npx @idrac/edge-agent` (npm package name; product name is **UiDRAC agent**).

## Windows

Set `UIDRAC_AGENT_CONFIG` or explicit env vars, then run `npx @idrac/edge-agent` under a persistent service account.

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
