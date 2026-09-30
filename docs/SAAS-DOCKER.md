# Conzex SaaS — production Docker (local or VM)

Use this path when you run the **cloud (SaaS) product** in Docker: tenants require the **UiDRAC edge agent**, and the API does not probe iDRAC directly from the container network.

## Prerequisites

- Docker Engine 24+ and Compose v2
- 4 GB+ RAM
- TLS certificates in `nginx/certs/` (or use lab HTTP on port 3000 via dev compose — not for production)
- Built legacy console image for iDRAC 6/7: `docker build -f docker/idrac-legacy.Dockerfile -t uidrac:legacy .`

## Quick start

```bash
cp .env.saas.example .env
bash scripts/generate-keys.sh --write
# Edit .env: POSTGRES_PASSWORD, PUBLIC_* URLs, CORS_ORIGINS

bash scripts/prod-saas-up.sh
```

Equivalent manual commands:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml build
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml up -d
```

## Agent installs (tenants)

Operators use **Agents** in the portal:

1. **credentials.json** — downloaded from the portal (tenant secret).
2. **CDN installers** — `UidracAgent.pkg`, `UidracAgentSetup.exe`, `UidracAgent-linux.sh` from `https://cdn.conzex.com/uidrac/agent/` (see [UIDRAC_AGENT.md](UIDRAC_AGENT.md)).

## Verify

```bash
curl -sk https://YOUR_DOMAIN/api/health
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml ps
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml logs u-api --tail 30
```

## Environment (SaaS)

| Variable | Purpose |
|----------|---------|
| `DEPLOYMENT_MODE=cloud` | Cloud routing via edge agents |
| `REQUIRE_EDGE_AGENT=true` | Block LAN probes without a connected agent |
| `AGENT_SIGNING_SECRET` | Agent WebSocket authentication |
| `NEXT_PUBLIC_*` / `PUBLIC_*` | Browser and agent URLs (must match nginx `server_name`) |

See `.env.saas.example` for a full template.

## Operators (end users)

1. Sign in at your organization URL.
2. Open **Agents** → install **Master-Agent (Default)** on a LAN host (Windows, Linux, or macOS).
3. Confirm **Connected** and note **Public IP** if shown.
4. **Servers** → **Add Server** (or bulk CSV on the Servers page) → probe and save.
5. Use **Operations Center** for fleet charts; open a server for Dashboard, System, Storage, Configuration, Maintenance, iDRAC, Console, and Power.

If the UI shows “Cannot reach the API”, restart the stack and check `u-api` logs (often a crashed API or wrong `NEXT_PUBLIC_API_URL`).

## Administrators

| Task | Action |
|------|--------|
| Restart API after deploy | `docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml restart u-api` |
| View API errors | `docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml logs u-api -f` |
| Agent not connecting | Confirm `wss://YOUR_DOMAIN/api/agent/ws`, firewall, and agent credentials bundle |
| 502 on iDRAC tabs | Agent disconnected or iDRAC unreachable from agent host |
| Backups | `pg_dump` via postgres service (see [DEPLOYMENT.md](DEPLOYMENT.md)) |
| Rotate agent secret | Update `AGENT_SIGNING_SECRET`, redeploy, re-download agent ZIPs |

## Dev stack vs production SaaS

| | Dev (`docker-compose.yml`) | Prod SaaS (`prod` + `saas` overlay) |
|--|------------------------------|----------------------------------------|
| TLS | No (localhost:3000 / :4000) | nginx 443 |
| Mode | Often mixed | `cloud` + agent required |
| Script | `pnpm docker:rebuild` | `pnpm docker:prod:build` |

For laptop development with agents, dev compose is fine; for “prod SaaS on Docker” use the prod + SaaS files above.

## Related

- [DEPLOYMENT.md](DEPLOYMENT.md) — VM, tunnel, troubleshooting  
- [UIDRAC_AGENT.md](UIDRAC_AGENT.md) — agent install per OS  
- In-app **Documentation** and **Contact us** pages
