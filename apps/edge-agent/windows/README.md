# Windows UiDRAC agent (Conzex cloud)

## Customer install

1. Portal → **Agents** → download **credentials.json**.
2. Download **UidracAgentSetup.exe** from the portal (CDN).
3. Run as Administrator, then:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:ProgramFiles\Conzex\UiDRAC Agent\install.ps1" -Config ".\credentials.json"
```

4. Confirm **Connected** under **Agents**.

## Build installers (engineering, Windows)

```powershell
cd <repo-root>
pwsh -File scripts/build-edge-agent-installer.ps1
```

Output: `apps/edge-agent/installer/out/UidracAgentSetup.exe` (and optional MSI).

Publish:

```bash
WIN_EXE=apps/edge-agent/installer/out/UidracAgentSetup.exe pnpm agent:cdn-stage
```

## Files in this folder

| File | Purpose |
|------|---------|
| `install.ps1` / `uninstall.ps1` | Service registration |
| `agent-bundle.cjs` | Built by `pnpm --filter @idrac/edge-agent run build:win-bundle` (not committed) |
