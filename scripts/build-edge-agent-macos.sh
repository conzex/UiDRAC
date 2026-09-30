#!/usr/bin/env bash
# Build Conzex UiDRAC Agent for macOS (.pkg + binary)
# Copyright (c) 2026 Conzex Global Private Limited
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${VERSION:-1.2.0}"
if [[ -f "$ROOT/version.txt" ]]; then
  VERSION="$(tr -d '[:space:]' <"$ROOT/version.txt")"
fi
PKG_VERSION="${VERSION}.0"

MACOS_DIR="$ROOT/apps/edge-agent/macos"
LEGAL_SRC="$ROOT/apps/edge-agent/installer/legal"
OUT_DIR="$MACOS_DIR/out"
PAYLOAD="$MACOS_DIR/build/payload"
RESOURCES="$MACOS_DIR/build/resources"

echo "=== Conzex UiDRAC Agent macOS build (v$VERSION) ==="

pnpm --filter @idrac/edge-agent build
pnpm --filter @idrac/edge-agent run build:mac-exe
cp -rf "$ROOT/apps/edge-agent/console/public" "$MACOS_DIR/console/" 2>/dev/null || true

mkdir -p "$OUT_DIR" "$PAYLOAD/Library/Application Support/Conzex/UiDRAC Agent"
INSTALL_ROOT="$PAYLOAD/Library/Application Support/Conzex/UiDRAC Agent"

cp -f "$MACOS_DIR/uidrac-agent" "$INSTALL_ROOT/uidrac-agent"
cp -f "$MACOS_DIR/agent-bundle.cjs" "$INSTALL_ROOT/agent-bundle.cjs"
chmod 755 "$INSTALL_ROOT/uidrac-agent"
chmod 644 "$INSTALL_ROOT/agent-bundle.cjs"
cp -f "$MACOS_DIR/install.sh" "$INSTALL_ROOT/install.sh"
cp -f "$MACOS_DIR/install-macos-agent.sh" "$INSTALL_ROOT/install-macos-agent.sh"
cp -f "$MACOS_DIR/repair-local-connection.sh" "$INSTALL_ROOT/repair-local-connection.sh"
cp -f "$MACOS_DIR/uninstall.sh" "$INSTALL_ROOT/uninstall.sh"
chmod 755 "$INSTALL_ROOT/install.sh" "$INSTALL_ROOT/install-macos-agent.sh" "$INSTALL_ROOT/repair-local-connection.sh" "$INSTALL_ROOT/uninstall.sh"
cp -f "$LEGAL_SRC/CONZEX-EULA.txt" "$INSTALL_ROOT/CONZEX-EULA.txt"
cp -f "$LEGAL_SRC/COPYRIGHT.txt" "$INSTALL_ROOT/COPYRIGHT.txt"
CONSOLE_SRC="$ROOT/apps/edge-agent/console/public"
if [[ -d "$CONSOLE_SRC" ]]; then
  mkdir -p "$INSTALL_ROOT/console/public"
  cp -f "$CONSOLE_SRC/"* "$INSTALL_ROOT/console/public/"
fi

mkdir -p "$RESOURCES/en.lproj"
cp -f "$LEGAL_SRC/CONZEX-EULA.txt" "$RESOURCES/en.lproj/License.txt"
cp -f "$LEGAL_SRC/COPYRIGHT.txt" "$RESOURCES/en.lproj/Welcome.txt"

COMPONENT="$OUT_DIR/uidrac-agent-component.pkg"
FINAL="$OUT_DIR/UidracAgent.pkg"

pkgbuild \
  --root "$PAYLOAD" \
  --identifier "com.conzex.uidrac.agent" \
  --version "$PKG_VERSION" \
  --install-location "/" \
  --scripts "$MACOS_DIR/pkg-scripts" \
  "$COMPONENT"

cat >"$MACOS_DIR/build/Distribution.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
  <title>Conzex UiDRAC Agent</title>
  <organization>com.conzex</organization>
  <domains enable_localSystem="true"/>
  <options customize="never" require-scripts="false" rootVolumeOnly="true"/>
  <welcome file="Welcome.txt" mime-type="text/plain"/>
  <license file="License.txt" mime-type="text/plain"/>
  <choices-outline>
    <line choice="default"/>
  </choices-outline>
  <choice id="default" title="UiDRAC Agent">
    <pkg-ref id="com.conzex.uidrac.agent"/>
  </choice>
  <pkg-ref id="com.conzex.uidrac.agent" version="$PKG_VERSION" onConclusion="none">uidrac-agent-component.pkg</pkg-ref>
</installer-gui-script>
EOF

productbuild \
  --distribution "$MACOS_DIR/build/Distribution.xml" \
  --resources "$RESOURCES" \
  --package-path "$OUT_DIR" \
  "$FINAL"

echo ""
echo "  Binary: $MACOS_DIR/uidrac-agent"
echo "  PKG:    $FINAL"
echo ""
echo "Install daemon (after PKG or from repo):"
echo "  sudo \"$INSTALL_ROOT/install.sh\" --config /path/to/uidrac-agent-darwin.json"
echo ""
echo "Publish to API: copy UidracAgent.pkg to agent-macos/"
