#!/usr/bin/env bash
# Build all Conzex UiDRAC agent artifacts for production ZIP/API hosting.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Edge agent bundles (macOS + Windows node bundles) ==="
pnpm --filter @idrac/edge-agent run build:mac-exe

if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "=== macOS PKG ==="
  if [[ -x "$ROOT/scripts/build-edge-agent-macos.sh" ]]; then
    "$ROOT/scripts/build-edge-agent-macos.sh" || echo "PKG build skipped (see script output)"
  fi
fi

echo "=== Linux install scripts (included in API ZIP) ==="
chmod +x "$ROOT/apps/edge-agent/linux/install-linux.sh" 2>/dev/null || true

echo "Done. Ensure agent-macos/ and agent-windows/ contain PKG/MSI/setup for full ZIP contents."
echo "Production URLs use DEPLOYMENT_MODE=cloud → https://uidrac.cloud.conzex.com"
