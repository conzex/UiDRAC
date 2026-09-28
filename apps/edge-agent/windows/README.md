# Windows UiDRAC agent — service install (Conzex cloud)

Installs a **Windows service** (`UiDRACAgent`) that keeps the edge agent connected to your Conzex cloud portal (similar to Cloudflare Tunnel).

## Operator flow

1. **Settings → Agent download → Windows** — save `uidrac-agent-win.json`.
2. **Install binaries** (pick one):
   - **MSI (recommended):** download `uidrac-agent-setup.msi` from `{CLOUD_URL}/api/agent/download/msi` (after Conzex builds/publishes the MSI), or build locally with `scripts/build-edge-agent-msi.ps1`.
   - **Dev:** place `nssm.exe` (win64 from [nssm.cc](https://nssm.cc/download)) in this folder and use Node 20+.
3. **Register service** (elevated PowerShell):

```powershell
Invoke-WebRequest -Uri "https://uidrac.cloud.conzex.com/api/agent/install.ps1" -OutFile install.ps1
powershell -ExecutionPolicy Bypass -File install.ps1 -Config .\uidrac-agent-win.json
```

Config is copied to `%ProgramData%\Conzex\UiDRAC\agent.json`. Logs: `%ProgramData%\Conzex\UiDRAC\logs\`.

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Program Files\Conzex\UiDRAC Agent\uninstall.ps1"
```

## Build MSI (Conzex release engineering, Windows machine)

```powershell
cd repo
pwsh -File scripts/build-edge-agent-msi.ps1
# Output: apps/edge-agent/installer/out/uidrac-agent-setup.msi
```

Copy the MSI to the API host or object storage so `GET /api/agent/download/msi` can serve it.

## Files (git)

| File | Purpose |
|------|---------|
| `install.ps1` | Service registration (NSSM) |
| `uninstall.ps1` | Remove service |
| `nssm.exe` | **Not in git** — fetched at MSI build time |
| `uidrac-agent.exe` | **Not in git** — built with `pkg` at MSI build time |
