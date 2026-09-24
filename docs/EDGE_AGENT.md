# Edge Agent (cloud deployment)

When the platform runs in the cloud and iDRAC hosts live on customer LANs, enable the tenant-bound edge agent.

## Flow

1. **Customer registers** — API creates a `TenantEdgeAgent` record (unique `publicId`, encrypted secret, HMAC enrollment signature).
2. **Agent Download** — Dashboard → **Agent Download** (before **Add Server**) → JSON bundle for Linux, macOS, or Windows.
3. **Install locally** — Run `@idrac/edge-agent` on a host that can reach iDRAC on the LAN.
4. **Secure connect** — Agent authenticates with `agentId` + `agentSecret` over WSS (`/api/agent/ws`). Credentials map to exactly one tenant; another tenant's bundle cannot authenticate.
5. **Add server** — User enters iDRAC IP; cloud sends probe to **their** connected agent only; agent validates Redfish/legacy access on the LAN.
6. **Server saved** — Only after successful agent-side probe.

## Environment variables (API)

| Variable | Description |
|----------|-------------|
| `REQUIRE_EDGE_AGENT=true` | Probe/add-server must use a connected agent (use in cloud prod). |
| `PUBLIC_API_URL` | Public URL of API (used in download bundle and WSS URL), e.g. `https://console.example.com`. |
| `AGENT_SIGNING_SECRET` | HMAC/JWT signing for enrollment tokens (unique per deployment). |
| `MASTER_ENCRYPTION_KEY` | AES-256 key for agent secret at rest (same as iDRAC credential encryption). |

Self-hosted Docker (API can reach iDRAC directly): leave `REQUIRE_EDGE_AGENT` unset or `false`.

## Running the agent

```bash
# After downloading idrac-agent-linux.json from the dashboard:
export IDRAC_AGENT_CONFIG=./idrac-agent-linux.json
pnpm --filter @idrac/edge-agent dev
# or: npx @idrac/edge-agent
```

Install script (Linux/macOS): `curl -fsSL "$PUBLIC_API_URL/api/agent/install.sh" | bash -s -- --config idrac-agent-linux.json`

## Tenant isolation

- One agent identity per tenant (DB unique on `tenant_id`).
- WebSocket auth verifies argon2 secret hash; connection is registered under that tenant only.
- Cloud RPC never accepts a client-supplied `tenantId` for routing — only the authenticated socket's tenant.
- Rotate credentials from **Settings → Rotate credentials** (Admin/Owner); old secrets stop working.

## Roadmap

- Package signed OS installers (MSI/pkg/deb)
- mTLS client certificates in addition to shared secret
- Route all iDRAC operations (not only probe) through the agent for full cloud mode
