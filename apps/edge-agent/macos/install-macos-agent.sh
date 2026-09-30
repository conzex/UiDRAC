#!/usr/bin/env bash
# One-command macOS install: PKG (optional) + LaunchDaemon + tenant credentials.
# Copyright (c) 2026 Conzex Global Private Limited
#
# From the unzipped portal download folder:
#   cd ~/Downloads/UidracAgent-macos-*
#   sudo ./install-macos-agent.sh
#
# Or with an explicit credentials path:
#   sudo ./install-macos-agent.sh --config /path/to/credentials.json
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG=""
INSTALL_ROOT="/Library/Application Support/Conzex/UiDRAC Agent"
LABEL="com.conzex.uidrac.agent"

usage() {
  cat <<'EOF'
UiDRAC Agent — macOS install (background service, survives reboot)

Usage:
  sudo ./install-macos-agent.sh [--config /path/to/credentials.json]

Defaults:
  --config  credentials.json in this folder

Requires:
  Node.js 20+ (https://nodejs.org/ or: brew install node)

After install:
  Portal → Agents → Connected
  sudo launchctl print system/com.conzex.uidrac.agent | grep 'state ='
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

if [[ -z "$CONFIG" ]]; then
  if [[ -f "$DIR/credentials.json" ]]; then
    CONFIG="$DIR/credentials.json"
  else
    echo "Missing credentials.json in $DIR — download a fresh ZIP from Agents." >&2
    usage
  fi
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "Config not found: $CONFIG" >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-running with sudo…"
  exec sudo "$0" --config "$CONFIG"
fi

echo "=== UiDRAC Agent macOS install ==="
echo "Config: $CONFIG"

if [[ -f "$DIR/UidracAgent.pkg" ]]; then
  echo "Installing UidracAgent.pkg…"
  installer -pkg "$DIR/UidracAgent.pkg" -target /
else
  echo "No UidracAgent.pkg in folder — copying agent files to $INSTALL_ROOT"
  mkdir -p "$INSTALL_ROOT"
  for f in uidrac-agent agent-bundle.cjs install.sh uninstall.sh install-macos-agent.sh repair-local-connection.sh CONZEX-EULA.txt COPYRIGHT.txt; do
    [[ -f "$DIR/$f" ]] && cp -f "$DIR/$f" "$INSTALL_ROOT/$f" && chmod 755 "$INSTALL_ROOT/$f" 2>/dev/null || true
  done
fi

INSTALL_SH="$INSTALL_ROOT/install.sh"
if [[ ! -f "$INSTALL_SH" && -f "$DIR/install.sh" ]]; then
  cp -f "$DIR/install.sh" "$INSTALL_SH"
  chmod 755 "$INSTALL_SH"
fi

if [[ ! -x "$INSTALL_SH" ]]; then
  echo "install.sh missing under $INSTALL_ROOT" >&2
  exit 1
fi

"$INSTALL_SH" --config "$CONFIG"

echo ""
echo "=== Done ==="
echo "Service:  system/$LABEL (starts at boot, not tied to Terminal)"
echo "Verify:   sudo launchctl print system/$LABEL | grep 'state ='"
echo "Logs:     tail -f /Library/Logs/Conzex/uidrac-agent.log"
echo "Portal:   Agents → refresh until Connected → UiDRAC Agent console"
