# Agent CDN publish (`https://cdn.conzex.com/uidrac/agent/`)

Public installers only — **no** tenant credentials on CDN.

## One-command staging (recommended)

From repository root:

```bash
bash scripts/stage-agent-cdn.sh
```

This builds agent bundles and copies **all CDN objects** into:

`cdn-agent/` (repository root)

Upload that entire folder to your CDN origin at path `/uidrac/agent/`.

The script writes `MANIFEST.json` (SHA-256 per file) and `UPLOAD-README.txt`.

## Files to host (5 objects)

| CDN object | Used by | How it is produced |
|------------|---------|-------------------|
| **UidracAgent.pkg** | macOS portal + `curl` | `scripts/build-edge-agent-macos.sh` on macOS → `apps/edge-agent/macos/out/UidracAgent.pkg` |
| **UidracAgentSetup.exe** | Windows portal + `curl` | Windows: `pwsh -File scripts/build-edge-agent-installer.ps1` → `apps/edge-agent/installer/out/` |
| **UidracAgent-linux.sh** | Linux portal + `curl` | Source: `apps/edge-agent/linux/UidracAgent-linux.sh` (copied as-is) |
| **agent-bundle.cjs** | Linux install (auto-download) | `pnpm --filter @idrac/edge-agent run build:win-bundle` → copy from `apps/edge-agent/macos/agent-bundle.cjs` |
| **uidrac-agent.service** | Linux install (auto-download) | Source: `apps/edge-agent/linux/uidrac-agent.service` |

Portal UI links only the **three installer filenames** (pkg / exe / sh). Linux script pulls the last two from the same CDN folder.

## Customer flow (all platforms)

1. **Agents** in portal → download **tenant credential bundle** (secret).
2. Download **OS installer** from CDN (links on **Agents** page).
3. Install using on-screen steps or **Manual / Terminal** on **Agents**.
4. Confirm **Connected**.

## CDN configuration

| Setting | Purpose |
|---------|---------|
| **HTTPS** | Required for `curl -fsSL` |
| **CORS** | Optional; browser direct download usually same-origin or attachment |
| **Cache** | Short TTL (e.g. 1h) during rollouts; bump cache after new version |
| **Content-Type** | `.pkg` `application/octet-stream`, `.exe` `application/octet-stream`, `.sh` `text/x-shellscript` or `application/octet-stream`, `.cjs` `application/javascript` |

Override base URL in deployment: `AGENT_CDN_BASE_URL` (API and web).

## Build prerequisites

| OS | Build machine |
|----|----------------|
| Bundles (`agent-bundle.cjs`) | Any — Node 20+, `pnpm install` |
| **UidracAgent.pkg** | macOS with `pkgbuild` / `productbuild` |
| **UidracAgentSetup.exe** | Windows with Inno Setup 6 (+ optional WiX for MSI) |

Cross-platform:

1. On **macOS/Linux**: `pnpm agent:cdn-stage` → PKG + Linux files + `agent-bundle.cjs`.
2. **Windows EXE** (Inno Setup — not available on Mac):
   - **GitHub Actions** → workflow **Build UiDRAC Agent (Windows)** → download artifact `uidrac-agent-windows-installers` → extract `UidracAgentSetup.exe`.
   - Or on a Windows machine: `pwsh -File scripts/build-edge-agent-installer.ps1`.
3. Re-stage with the EXE:
   ```bash
   WIN_EXE=~/Downloads/UidracAgentSetup.exe pnpm agent:cdn-stage
   ```

Do not paste shell comment lines (lines starting with `#`) into the terminal.

## Verify after upload

```bash
BASE=https://cdn.conzex.com/uidrac/agent
curl -fsI "$BASE/UidracAgent-linux.sh"
curl -fsI "$BASE/agent-bundle.cjs"
curl -fsI "$BASE/uidrac-agent.service"
# After PKG/EXE upload:
curl -fsI "$BASE/UidracAgent.pkg"
curl -fsI "$BASE/UidracAgentSetup.exe"
```

## Code signing (production)

Sign **UidracAgent.pkg** (Apple) and **UidracAgentSetup.exe** (Authenticode) before wide distribution. See installer README and Conzex engineering runbook.
