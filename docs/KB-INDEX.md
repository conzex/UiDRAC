# Product knowledge base (Conzex)

Operator-facing **Docs** in the web app mirror this index. Engineering runbooks live under `docs/`.

## URLs (lab Docker)

| What | URL |
|------|-----|
| **Portal (sign in here)** | http://localhost:3000 |
| **REST API** | http://localhost:4000/api |
| **Health check** | http://localhost:4000/api/health |
| **API root** | http://localhost:4000/ → JSON hints or redirect to portal |
| **Legacy console gateway** | http://localhost:6080 |

Do not use `http://localhost:4000/` alone expecting the UI—the UI is on port **3000**.

## Topics

| Topic | In-app Docs section | Markdown |
|-------|---------------------|----------|
| Getting started, workflows | Getting Started | — |
| UiDRAC agent (CDN installers) | UiDRAC Agent | [UIDRAC_AGENT.md](UIDRAC_AGENT.md) |
| SaaS Docker (operators) | Administrator guide | [SAAS-DOCKER.md](SAAS-DOCKER.md) |
| VM / lab deploy | Administrator guide | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Agent CDN publish (Conzex engineering) | — | Internal installer repo folder (not for customers) |
| Virtual console (HTML5 + tunnel) | Virtual Console | DEPLOYMENT troubleshooting |
| Sync from iDRAC (all tabs, %) | Dashboard | — |
| Versions | Product Versions | [VERSIONING.md](VERSIONING.md) |
| Cloudflare Tunnel | — | [CLOUDFLARE-TUNNEL.md](CLOUDFLARE-TUNNEL.md) |
| Agent production | — | [CONZEX_AGENT_PRODUCTION.md](CONZEX_AGENT_PRODUCTION.md) |
| Open-source fork (MIT) | — | [REPOS.md](../REPOS.md) |

## Agent installers (CDN)

Stage all publishable files: `pnpm agent:cdn-stage` → upload `cdn-agent/` (see `apps/edge-agent/installer/CDN-PUBLISH.md`).

Public binaries (no tenant secrets):

- https://cdn.conzex.com/uidrac/agent/UidracAgent.pkg
- https://cdn.conzex.com/uidrac/agent/UidracAgentSetup.exe
- https://cdn.conzex.com/uidrac/agent/UidracAgent-linux.sh
- https://cdn.conzex.com/uidrac/agent/agent-bundle.cjs (Linux, via install script)
- https://cdn.conzex.com/uidrac/agent/uidrac-agent.service (Linux, via install script)

Tenant **credential bundle** is always downloaded from **Agents** in the portal (not on CDN).

## Support data to include in tickets

Organization name, product version (footer or `/api/health`), agent **Connected** status, iDRAC IP (if probe fails), and whether deployment is Conzex cloud or licensed Docker SaaS.
