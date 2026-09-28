# Conzex UiDRAC Agent — Windows installers

**Copyright (c) 2026 Conzex Global Private Limited. All rights reserved.**

| Artifact | Description |
|----------|-------------|
| **`UidracAgentSetup.exe`** | Inno Setup wizard — EULA, copyright, pick `uidrac-agent-win.json`, installs service |
| **`uidrac-agent-setup.msi`** | WiX MSI — runtime files + legal text (run `install.ps1 -Config` after) |
| **`uidrac-agent.exe`** | Standalone agent binary (pkg) |

## Build (Windows machine)

```powershell
cd universal-idrac-console
pwsh -File scripts/build-edge-agent-installer.ps1
```

Requires: Node/pnpm, `pkg`, WiX v4 (`dotnet tool install --global wix`), Inno Setup 6.

Output: `apps/edge-agent/installer/out/`

## Publish to Conzex cloud API

Copy to the API container/host:

- `agent-windows/UidracAgentSetup.exe` → `GET /api/agent/download/setup`
- `agent-windows/uidrac-agent-setup.msi` → `GET /api/agent/download/msi`

## Customer flow

1. Portal → **Settings → Agent download → Windows** → save JSON.
2. Download **`UidracAgentSetup.exe`** from `{cloud}/api/agent/download/setup`.
3. Run as Administrator, accept **Conzex EULA**, select JSON file.
4. Confirm **Connected** in Settings.

## Legal files

- `legal/CONZEX-EULA.txt` — end-user license
- `legal/COPYRIGHT.txt` — copyright and publisher
- `License.rtf` — shown in MSI UI

## Code signing (production)

Sign `UidracAgentSetup.exe` and `.msi` with your Conzex Authenticode certificate before public distribution:

```powershell
signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com UidracAgentSetup.exe
```
