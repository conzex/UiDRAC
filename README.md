# Universal iDRAC Console

> Zero-client-install, Docker-hosted web platform for managing Dell PowerEdge servers
> across ALL iDRAC generations (6, 7, 8, 9) from a single browser UI.

[![CI](https://github.com/sumit-kumawat/universal-idrac-console/actions/workflows/ci.yml/badge.svg)](https://github.com/sumit-kumawat/universal-idrac-console/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is this?

A web platform where you log in once with your platform account, then manage any
number of Dell servers by entering iDRAC IP + credentials. The platform auto-detects
the iDRAC generation and routes to the correct console type:

| Generation | Console Method | How It Works |
|-----------|----------------|--------------|
| iDRAC 8/9 | HTML5 native | Embedded iframe — zero overhead |
| iDRAC 7   | noVNC bridge | Java JNLP viewer runs server-side in Docker |
| iDRAC 6   | noVNC bridge | Legacy Java viewer runs server-side in Docker |

**The user NEVER installs Java, ActiveX, plugins, or any desktop software.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Any)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Next.js    │  │   HTML5      │  │    noVNC      │  │
│  │   Frontend   │  │   iFrame     │  │    Canvas     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │ HTTPS            │ HTTPS            │ WSS
┌─────────┼──────────────────┼──────────────────┼──────────┐
│  Nginx  │ TLS Termination  │                  │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼───────┐  │
│  │   NestJS     │  │   iDRAC 8/9  │  │  Console GW   │  │
│  │   API :4000  │  │   Direct     │  │   :6080       │  │
│  └──────┬───────┘  └──────────────┘  └───────┬───────┘  │
│         │                                     │          │
│  ┌──────▼───────┐                    ┌───────▼───────┐  │
│  │  PostgreSQL  │                    │ Legacy Docker  │  │
│  │  :5432       │                    │ Containers     │  │
│  ├──────────────┤                    │ (Xvfb+x11vnc  │  │
│  │    Redis     │                    │  +Java viewer) │  │
│  │  :6379       │                    └───────────────┘  │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- 2 vCPU / 4GB RAM minimum

### 1. Clone and configure

```bash
git clone https://github.com/sumit-kumawat/universal-idrac-console.git
cd universal-idrac-console
cp .env.example .env
```

### 2. Generate secrets

```bash
bash scripts/generate-keys.sh
# Copy the output into your .env file
```

### 3. Start everything

```bash
# Development (with hot reload)
docker compose up -d

# Production (with TLS)
docker compose -f docker-compose.prod.yml up -d
```

### 4. Access the UI

- **Development:** http://localhost:3000
- **Production:** https://idrac.yourdomain.com

### 5. First-time setup

On first boot the database is empty. Navigate to the app and:

1. Click **"Register"** to create your tenant and admin account
2. Click **"Add Server"** to connect your first iDRAC
3. The platform auto-detects the iDRAC generation and shows real hardware data

## How to Add a Server

1. Log in to the platform
2. Click **"Add Server"** on the Dashboard
3. Enter the iDRAC IP address and credentials
4. The platform will auto-detect the generation (probes `/redfish/v1`, `/data?get=version`, `/cgi-bin/webcgi/login`)
5. Confirm the detected model and generation
6. Choose credential storage: **Save** (encrypted in database) or **Session only** (Redis, 30-min TTL)
7. Done! The server appears on your dashboard

### Bulk Import from CSV

```csv
ip,username,password,name
192.168.1.100,root,calvin,R740xd-Prod-01
192.168.1.101,root,calvin,R730-Staging-01
192.168.1.102,root,calvin,R720-Dev-01
```

```bash
bash scripts/import-csv.sh servers.csv http://localhost:4000 YOUR_AUTH_TOKEN
```

## How the Legacy Console Bridge Works

For iDRAC 6/7, which require Java Web Start / ActiveX (unsupported in modern browsers):

1. User clicks **"Launch Console"** for an iDRAC 6/7 server
2. API calls Console Gateway → `POST /spawn`
3. Console GW spawns a Docker container (`universal-idrac-console:legacy`) containing:
   - Java 8 runtime (Eclipse Temurin)
   - Xvfb (virtual framebuffer at 1280x1024)
   - x11vnc (captures Xvfb, serves VNC)
   - Dell's Java viewer (downloaded from iDRAC)
4. Container connects to the iDRAC and renders the console in the virtual display
5. Browser connects to Console GW via WebSocket → proxied to container's VNC
6. noVNC renders the VNC stream in an HTML5 canvas
7. Container auto-stops after 30 minutes of idle time

**Image size:** ~600MB (Java 8 + X11 dependencies). Built once, shared by all sessions.

## Security

| Aspect | Implementation |
|--------|---------------|
| User passwords | argon2id (OWASP recommended) |
| iDRAC credentials at rest | AES-256-GCM encryption |
| Session credentials | Redis with 30-min TTL (never on disk) |
| Transport | TLS 1.2+ everywhere |
| Auth tokens | JWT (15 min) + rotating refresh tokens (7 days) |
| RBAC | 4 roles: owner, admin, operator, viewer |
| Tenant isolation | Row-level filtering by tenant_id |
| Console containers | `--cap-drop=ALL --read-only --no-new-privileges` |
| Headers | HSTS, CSP, X-Frame-Options: SAMEORIGIN |
| Rate limiting | Login: 5/min/IP, Server add: 10/min/user |
| Audit logging | Every action logged with user, IP, timestamp |
| Credential handling | Never logged, never in browser, HTTPS only |

## Environment Variables

See [`.env.example`](.env.example) for all variables with documentation.

Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `REFRESH_SECRET` | Refresh token secret | ✅ |
| `MASTER_ENCRYPTION_KEY` | AES-256 key for iDRAC creds (64 hex chars) | ✅ |
| `IDRAC_CONSOLE_IMAGE` | Docker image for legacy console | ❌ |

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start dev servers
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Adding a New iDRAC Generation

See [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-idrac-generation) for detailed instructions.

## Troubleshooting

### Legacy console won't connect

1. Ensure the Docker socket is mounted: `-v /var/run/docker.sock:/var/run/docker.sock`
2. Check the legacy image is built: `docker images | grep legacy`
3. Check console-gw logs: `docker compose logs console-gw`
4. Verify iDRAC is reachable from Docker network: `docker compose exec api curl -k https://IDRAC_IP`

### "Unable to detect iDRAC generation"

- Verify the iDRAC IP is reachable from the Docker network
- Check firewall rules (ports 443, 80)
- Try accessing `https://IDRAC_IP/redfish/v1` directly from the API container
- Some very old iDRAC 6 units need a firmware update to expose CGI endpoints

### Database migrations fail

```bash
# Reset and re-create
pnpm db:migrate:dev -- --name init

# Or force reset (destroys data!)
npx prisma migrate reset --force
```

### Slow console performance

- Increase container CPU/memory limits in `docker-compose.prod.yml`
- Reduce resolution in the legacy Dockerfile (change `1280x1024` to `1024x768`)
- Check network latency between Docker host and iDRAC

## License

[MIT](LICENSE)
