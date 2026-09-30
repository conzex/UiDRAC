# Agent CDN layout (`https://cdn.conzex.com/uidrac/agent/`)

Publish **installer filenames only** (portal links):

| File | Source |
|------|--------|
| `UidracAgent.pkg` | `apps/edge-agent/macos/out/UidracAgent.pkg` (or build script) |
| `UidracAgentSetup.exe` | Inno build `UidracAgentSetup.exe` |
| `UidracAgent-linux.sh` | `apps/edge-agent/linux/UidracAgent-linux.sh` |

Linux installer also fetches (same folder, not shown in portal UI):

- `agent-bundle.cjs` — `node apps/edge-agent/scripts/bundle-agent.mjs`
- `uidrac-agent.service` — `apps/edge-agent/linux/uidrac-agent.service`

Override base URL: `AGENT_CDN_BASE_URL` on API / web env.
