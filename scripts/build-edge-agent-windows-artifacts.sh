#!/usr/bin/env bash
# Cross-platform Windows agent artifacts (bundle + zip). Full MSI/EXE needs Windows + WiX + Inno.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
WIN="$ROOT/apps/edge-agent/windows"
OUT="$ROOT/apps/edge-agent/installer/out"
mkdir -p "$OUT"

pnpm --filter @idrac/edge-agent run build:win-bundle
mkdir -p "$WIN/console/public"
cp -f "$ROOT/apps/edge-agent/console/public/"* "$WIN/console/public/" 2>/dev/null || true

ZIP="$OUT/UidracAgent-Windows-bundle.zip"
rm -f "$ZIP"
(
  cd "$WIN"
  zip -r "$ZIP" agent-bundle.cjs run-uidrac-agent.cmd install.ps1 uninstall.ps1 nssm.exe console 2>/dev/null || \
  zip -r "$ZIP" agent-bundle.cjs run-uidrac-agent.cmd install.ps1 uninstall.ps1 console
)

mkdir -p "$ROOT/agent-windows"
cp -f "$WIN/agent-bundle.cjs" "$WIN/run-uidrac-agent.cmd" "$ROOT/agent-windows/" 2>/dev/null || true
cp -rf "$WIN/console" "$ROOT/agent-windows/" 2>/dev/null || true

echo "Windows bundle: $ZIP"
echo "Run on Windows for MSI/EXE: pwsh -File scripts/build-edge-agent-installer.ps1"
