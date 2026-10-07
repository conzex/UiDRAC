# CDN publish folder (`/uidrac/agent/`)

**Single canonical location** for all OS agent binaries (replaces legacy root `agent-macos/` and `agent-windows/` copies).

This directory holds the **five public files** served at:

`https://cdn.conzex.com/uidrac/agent/`

| File | Role |
|------|------|
| `UidracAgent.pkg` | macOS installer |
| `UidracAgentSetup.exe` | Windows installer |
| `UidracAgent-linux.sh` | Linux installer |
| `agent-bundle.cjs` | Linux runtime (auto-downloaded by linux script) |
| `uidrac-agent.service` | Linux systemd unit (auto-downloaded by linux script) |

**Do not** put `credentials.json` here.

## Generate / refresh files

From repository root:

```bash
pnpm agent:cdn-stage
```

Windows EXE (build on Windows or GitHub Actions):

```bash
WIN_EXE=/path/to/UidracAgentSetup.exe pnpm agent:cdn-stage
```

Verify before upload:

```bash
pnpm agent:cdn-verify
```

## Upload to CDN server

Upload **the contents** of this folder to your CDN path `/uidrac/agent/`:

```bash
rsync -avz cdn-agent/ user@cdn-host:/home/conzex/cdn.conzex.com/uidrac/agent/
```

After upload, each URL should return HTTP 200, for example:

`https://cdn.conzex.com/uidrac/agent/UidracAgent-linux.sh`

See `apps/edge-agent/installer/CDN-PUBLISH.md` and `CDN-PORTAL-FILES.md`.
