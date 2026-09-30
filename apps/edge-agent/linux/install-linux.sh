#!/usr/bin/env bash
# Conzex UiDRAC Agent — Linux install (systemd). Copyright (c) 2026 Conzex Global Private Limited
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/credentials.json"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="${2:?}"
      shift 2
      ;;
    *)
      CONFIG="$1"
      shift
      ;;
  esac
done
if [[ ! -f "$CONFIG" ]]; then
  echo "Missing credentials.json — download from Agents → Download Agent in the Conzex portal." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required." >&2
  exit 1
fi
INSTALL_ROOT="/opt/conzex/uidrac-agent"
sudo mkdir -p "$INSTALL_ROOT"
sudo cp "$DIR/agent-bundle.cjs" "$DIR/credentials.json" "$INSTALL_ROOT/"
if [[ -d "$DIR/console/public" ]]; then
  sudo mkdir -p "$INSTALL_ROOT/console"
  sudo cp -R "$DIR/console/public" "$INSTALL_ROOT/console/"
fi
sudo cp "$DIR/uidrac-agent.service" /etc/systemd/system/uidrac-agent.service
sudo sed -i "s|/opt/conzex/uidrac-agent|$INSTALL_ROOT|g" /etc/systemd/system/uidrac-agent.service 2>/dev/null || true
sudo systemctl daemon-reload
sudo systemctl enable uidrac-agent
sudo systemctl restart uidrac-agent
echo "UiDRAC agent installed. Console: portal → Agents → UiDRAC Agent console."
echo "Cloud: $(node -pe "JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).cloudUrl" 2>/dev/null || echo 'see credentials.json')"
