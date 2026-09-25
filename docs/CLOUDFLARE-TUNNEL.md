# Publish with Cloudflare Tunnel

Expose Universal iDRAC Console **without opening inbound ports 80/443** on your VM firewall. Cloudflare terminates HTTPS for browsers; **cloudflared** on the VM connects **outbound** to Cloudflare and forwards traffic to the local stack.

**Works with:** Web UI, `/api/*`, **WebSockets** (`/api/agent/ws`, `/console/` noVNC), and edge agents when using cloud mode.

---

## Which port does cloudflared use?

Production Docker publishes **nginx** on the VM host:

| Host port | Service | Use with Cloudflare Tunnel |
|-----------|---------|----------------------------|
| **443** | nginx (HTTPS → web, api, console-gw) | **Recommended** — point tunnel here |
| **80** | nginx (HTTP → redirects to HTTPS) | Only `/health` is useful; prefer **443** |
| 3000 / 4000 / 6080 | Dev compose only | **Do not** use for production tunnel |

**Recommended origin URL:**

```text
https://127.0.0.1:443
```

Use `originRequest.noTLSVerify: true` when nginx uses a **self-signed** certificate (typical before or instead of public LE on the VM). Browsers still see valid HTTPS from Cloudflare on your public hostname.

---

## Architecture

```text
User browser ──HTTPS──► Cloudflare edge (your hostname)
                              │
                         cloudflared (outbound only)
                              │
                         https://127.0.0.1:443  ──► nginx ──► web / api / console-gw
```

iDRAC traffic still goes **VM → iDRAC on your LAN** (unchanged). The tunnel only publishes the web app.

---

## Prerequisites

1. Domain on **Cloudflare** (DNS proxied orange cloud).
2. Production stack running: `bash scripts/vm-prod.sh` (nginx listening on **443**).
3. TLS files in `nginx/certs/` (self-signed is OK with `noTLSVerify`).

---

## Step 1 — Start the app on the VM

```bash
cp .env.selfhosted.example .env
# Edit PUBLIC_* and NEXT_PUBLIC_* to your Cloudflare hostname, e.g.:
#   https://idrac.yourdomain.com
bash scripts/vm-prod.sh
curl -sk https://127.0.0.1/api/health
```

Edit **`nginx/nginx.conf`**: set `server_name` to `idrac.yourdomain.com` (or keep `_`).

Set in **`.env`** (all must match your public hostname):

```env
PUBLIC_APP_URL=https://idrac.yourdomain.com
PUBLIC_API_URL=https://idrac.yourdomain.com
NEXT_PUBLIC_APP_URL=https://idrac.yourdomain.com
NEXT_PUBLIC_API_URL=https://idrac.yourdomain.com/api
NEXT_PUBLIC_CONSOLE_URL=https://idrac.yourdomain.com/console
CORS_ORIGINS=https://idrac.yourdomain.com
```

Rebuild web if you change `NEXT_PUBLIC_*`:

```bash
docker compose -f docker-compose.prod.yml up -d --build web
```

---

## Step 2 — Install cloudflared on the VM

```bash
# Debian / Ubuntu
curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
cloudflared --version
```

---

## Step 3 — Create a tunnel (Cloudflare Zero Trust dashboard)

1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**.
2. **Create a tunnel** → name e.g. `uidrac-prod`.
3. Choose **Debian/Ubuntu** and copy the install command, **or** copy the **tunnel token** for Docker/systemd.
4. Under **Public Hostname**, add:

   | Field | Value |
   |-------|--------|
   | Subdomain | `idrac` (or your choice) |
   | Domain | `yourdomain.com` |
   | **Service type** | HTTPS |
   | **URL** | `127.0.0.1:443` |
   | **Additional settings** | Enable **No TLS Verify** (origin certificate is self-signed on VM) |

   Equivalent **config file** ingress (see [`../cloudflare/config.yml.example`](../cloudflare/config.yml.example)):

   ```yaml
   ingress:
     - hostname: idrac.yourdomain.com
       service: https://127.0.0.1:443
       originRequest:
         noTLSVerify: true
     - service: http_status:404
   ```

5. Save. Cloudflare creates a **CNAME** for `idrac.yourdomain.com` → `<tunnel-id>.cfargotunnel.com`.

---

## Step 4 — Run cloudflared

### Option A — Token (simplest)

From the tunnel page, run the provided command on the VM, e.g.:

```bash
sudo cloudflared service install <TUNNEL_TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

### Option B — Config file

```bash
sudo mkdir -p /etc/cloudflared
sudo cp cloudflare/config.yml.example /etc/cloudflared/config.yml
# Edit: tunnel id, credentials-file path, hostname
sudo cloudflared tunnel login
sudo cloudflared tunnel create uidrac-prod
sudo cloudflared tunnel route dns uidrac-prod idrac.yourdomain.com
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

---

## Step 5 — Verify

```bash
curl -s https://idrac.yourdomain.com/api/health
```

Open `https://idrac.yourdomain.com` → Register / login → add a server.

**UiDRAC agent (cloud mode):** set `REQUIRE_EDGE_AGENT=true` and use the same public URL; agent WebSocket: `wss://idrac.yourdomain.com/api/agent/ws`.

---

## Firewall on the VM

With Cloudflare Tunnel you can **close inbound 80/443** on the public interface. Keep:

- **Outbound** HTTPS (cloudflared → Cloudflare).
- **Outbound** or LAN access from the VM/docker network to **iDRAC** IPs.

---

## Cloudflare dashboard settings (recommended)

| Setting | Recommendation |
|---------|------------------|
| SSL/TLS mode | **Full** or **Full (strict)** if you install a valid origin cert; with self-signed origin use **Full** + tunnel **No TLS Verify** |
| WebSockets | Enabled (default for tunnels) |
| HTTP → HTTPS | On (Cloudflare edge) |

---

## Optional: run cloudflared in Docker

Add to `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=eyJh...
```

Use [`docker-compose.cloudflare.yml`](../docker-compose.cloudflare.yml):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.cloudflare.yml up -d
```

Uses `network_mode: host` so cloudflared can reach `127.0.0.1:443`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 502 / bad gateway | Stack up? `curl -sk https://127.0.0.1/api/health`. Tunnel URL must be **`127.0.0.1:443`**, not `3000`. |
| Redirect loop | `PUBLIC_APP_URL` and `NEXT_PUBLIC_*` must use **https://** same hostname as the tunnel. |
| WebSocket / agent fails | Tunnel hostname must cover `/api/agent/ws`; do not split API to another host without updating env. |
| CORS errors | Set `CORS_ORIGINS=https://idrac.yourdomain.com` exactly. |
| Certificate errors on origin | Enable **No TLS Verify** on the tunnel origin, or use Let’s Encrypt on nginx. |

---

## Quick test (temporary URL)

Not for production:

```bash
cloudflared tunnel --url https://127.0.0.1:443 --no-tls-verify
```

Use the printed `*.trycloudflare.com` URL only for smoke tests; update env URLs if you test auth flows.

See also: [`DEPLOYMENT.md`](DEPLOYMENT.md), [`README.md`](../README.md).
