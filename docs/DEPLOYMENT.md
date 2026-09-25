# Deployment guide — Universal iDRAC Console

> **Conzex licensed delivery only.** This file is for customers and operators who received a deployment package from Conzex. It is **not** a public self-service install path from GitHub.

This guide covers hosting on **your own VM** (primary), optional **Conzex cloud** mode, and lab setups.

## GitHub repositories

| Repository | URL |
|------------|-----|
| **Conzex product** | Provided with your licensed delivery package (not public self-service) |
| **Company** | https://www.conzex.com |
| **MIT open-source fork** (unrelated to Conzex support) | https://github.com/sumit-kumawat/uidrac |

Dual-repo workflow: [`REPOS.md`](../REPOS.md) on the Conzex tree.

| Goal | Start here |
|------|------------|
| Production on a Linux VM | [Self-hosted VM](#self-hosted-vm-production) |
| Publish via **Cloudflare Tunnel** (no open 80/443) | [Cloudflare Tunnel](CLOUDFLARE-TUNNEL.md) — origin **`https://127.0.0.1:443`** |
| Local laptop / lab | [Lab Docker](#lab-docker-compose) |
| Cloud + edge agent | [Cloud mode](#cloud-mode-uidracconzexcom) |

---

## Self-hosted VM (production)

Use this when the VM can reach iDRAC management IPs on your network. **No edge agent** is required.

### Checklist

1. **VM** — Ubuntu 24.04 LTS (or similar), 4 GB+ RAM, public or VPN access for admins only.
2. **Docker** — Engine 24+ and Compose v2 (`curl -fsSL https://get.docker.com | sudo sh`).
3. **DNS** — `A` record for e.g. `idrac.company.com` → VM public IP (or use internal DNS + VPN).
4. **Firewall** — Allow **80**, **443** inbound; block **5432**, **6379**, **4000**, **3000** from the internet.
5. **iDRAC network** — VM routing/firewall must allow **HTTPS to iDRAC** (usually port 443).

### Step-by-step

```bash
# On the VM — use the deployment package Conzex supplied under your license
cd /path/to/delivery
```

cp .env.selfhosted.example .env
bash scripts/generate-keys.sh
# Edit .env: paste secrets, set PUBLIC_* URLs to https://idrac.company.com
# Align POSTGRES_URL password with POSTGRES_PASSWORD
```

Edit **`nginx/nginx.conf`**: set `server_name` to your domain (search for `uidrac.cloud.conzex.com`).

Place TLS files in **`nginx/certs/`** — see [`nginx/certs/README.md`](../nginx/certs/README.md).

```bash
chmod +x scripts/vm-prod.sh
bash scripts/vm-prod.sh
```

Confirm:

```bash
curl -sk https://idrac.company.com/api/health
curl -sk https://idrac.company.com/api/ | jq .
```

First use: open the portal → **Register** → **Add Server**.

### Systemd (optional auto-start)

Docker Compose with `restart: unless-stopped` already restarts containers after reboot. Ensure Docker starts on boot:

```bash
sudo systemctl enable docker
```

### Backups

```bash
# Postgres
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql

# Volumes (alternative)
docker run --rm -v uidrac_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data.tgz /data
```

Store backups off-VM; rotate `MASTER_ENCRYPTION_KEY` only with a planned credential re-entry migration.

### Reverse proxy on the host (optional)

If you terminate TLS on the host instead of the bundled nginx container, proxy to the compose network and set `NEXT_PUBLIC_*` to your public URL. You must forward **WebSocket** headers for `/api/agent/ws` if you enable cloud mode later.

---

## Lab Docker Compose

For development or a private lab without bundled nginx:

```bash
cp .env.example .env
bash scripts/generate-keys.sh
bash scripts/host.sh
```

- UI: http://localhost:3000  
- API: http://localhost:4000/api  

Build legacy console for iDRAC 6/7:

```bash
docker build -f docker/idrac-legacy.Dockerfile -t uidrac:legacy .
```

---

## Cloud mode (uidrac.cloud.conzex.com)

When the API **cannot** reach iDRAC directly, use **edge agents** on customer LANs.

1. Copy **`.env.cloud.example`** → `.env`
2. Set `DEPLOYMENT_MODE=cloud`, `REQUIRE_EDGE_AGENT=true`, public URLs, `AGENT_SIGNING_SECRET`
3. Deploy: `docker compose -f docker-compose.prod.yml up -d --build`
4. Customers download the agent from **Settings** and connect via `wss://…/api/agent/ws`

See [`UIDRAC_AGENT.md`](UIDRAC_AGENT.md).

---

## VPS providers

Any VPS with Docker works (Hostinger, DigitalOcean, AWS EC2, Azure VM, Proxmox VM, etc.). Prefer:

- Static IP or stable DNS  
- 4 GB RAM minimum for production  
- Same region/VLAN as iDRAC when possible (low latency)

**Shared cPanel hosting** is generally **not** suitable (no Docker, no Postgres/Redis, weak WebSocket support). Use a VM.

---

## nginx / TLS

Production compose includes **nginx** on ports 80/443:

| Path | Backend |
|------|---------|
| `/` | Next.js `web` |
| `/api/` | NestJS `api` (includes `/api/agent/ws` WebSocket) |
| `/console/` | `console-gw` |

Environment:

| Variable | Default |
|----------|---------|
| `TLS_CERT_PATH` | `./nginx/certs/fullchain.pem` |
| `TLS_KEY_PATH` | `./nginx/certs/privkey.pem` |

HTTP redirects to HTTPS except `/health` on port 80 (load balancer checks).

---

## Switching modes

| Goal | Configuration |
|------|----------------|
| Your VM, API → iDRAC on LAN | `.env.selfhosted.example`, `REQUIRE_EDGE_AGENT=false` |
| Conzex cloud | `.env.cloud.example`, `REQUIRE_EDGE_AGENT=true` |
| Test edge agent locally | `REQUIRE_EDGE_AGENT=true` + agent on same LAN |

---

## Troubleshooting

### `502 Bad Gateway` from nginx

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs web api nginx
```

Wait for `api` healthcheck; first boot runs Prisma `db push`.

### Registration works but add-server fails

- Ping iDRAC from API container:  
  `docker compose -f docker-compose.prod.yml exec api sh -c 'wget -qO- --no-check-certificate https://IDRAC_IP/redfish/v1'`
- If `REQUIRE_EDGE_AGENT=true`, install and connect the edge agent first.

### Certificate / HSTS issues

Match `server_name`, certificate CN/SAN, and `PUBLIC_APP_URL`. After testing with self-signed certs, clear browser HSTS before switching to Let’s Encrypt.

### Console gateway / Docker socket

`console-gw` needs `/var/run/docker.sock`. On hardened hosts, ensure the daemon user can spawn containers and the legacy image exists:

```bash
docker images | grep uidrac
```

---

## Related docs

- [`README.md`](../README.md) — overview and quick VM path  
- [`CLOUDFLARE-TUNNEL.md`](CLOUDFLARE-TUNNEL.md) — Cloudflare Tunnel steps and **port 443** origin  
- [`UIDRAC_AGENT.md`](UIDRAC_AGENT.md) — cloud LAN UiDRAC agent  
- [`VERSIONING.md`](VERSIONING.md) — release numbering  
