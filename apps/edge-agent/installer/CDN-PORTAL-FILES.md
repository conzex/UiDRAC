# CDN folder vs portal (exact filenames)

Portal and **Agents** download links only use these URLs under  
`https://cdn.conzex.com/uidrac/agent/`:

| Must exist on CDN | Portal uses |
|-------------------|-------------|
| **UidracAgent.pkg** | macOS installer download |
| **UidracAgentSetup.exe** | Windows installer download |
| **UidracAgent-linux.sh** | Linux installer download |
| **agent-bundle.cjs** | Fetched by Linux script (not shown in UI) |
| **uidrac-agent.service** | Fetched by Linux script (not shown in UI) |

**Never publish on CDN:** `credentials.json` or any tenant agent bundle. Those are **portal-only** (per customer). Remove them from the CDN immediately if uploaded by mistake.

## Files you do not need on CDN

These live **inside** `UidracAgent.pkg` after install (or on disk under  
`/Library/Application Support/Conzex/UiDRAC Agent/`). Extra copies on CDN are optional and **not** linked by the portal:

- `install.sh`, `install-macos-agent.sh`, `uninstall.sh`, `repair-local-connection.sh`
- `uidrac-agent` (binary), `Install-UiDRAC-Agent.command`, `README.txt`

You can delete them from CDN to avoid confusion.

## Fix your current upload

1. **Delete** `credentials.json` from CDN (security).
2. **Upload** from `cdn-agent/` after `pnpm agent:cdn-stage`:
   - `UidracAgent-linux.sh` (missing today)
   - `uidrac-agent.service` (missing today)
   - `UidracAgentSetup.exe` (build on Windows or GitHub Actions — see CDN-PUBLISH.md)
3. Keep **UidracAgent.pkg** and **agent-bundle.cjs** (names already correct).

## Verify

```bash
bash scripts/verify-agent-cdn.sh
# or:
BASE=https://cdn.conzex.com/uidrac/agent bash scripts/verify-agent-cdn.sh
```
