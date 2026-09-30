#!/usr/bin/env bash
# Conzex UiDRAC Agent — CDN entry (https://cdn.conzex.com/uidrac/agent/UidracAgent-linux.sh)
set -euo pipefail
CDN_BASE="${UIDRAC_AGENT_CDN:-https://cdn.conzex.com/uidrac/agent}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

CONFIG=""
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
  echo "Usage: $0 --config /path/to/credentials.json" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required." >&2
  exit 1
fi

curl -fsSL "${CDN_BASE}/agent-bundle.cjs" -o "$WORKDIR/agent-bundle.cjs"
curl -fsSL "${CDN_BASE}/uidrac-agent.service" -o "$WORKDIR/uidrac-agent.service"
cp "$CONFIG" "$WORKDIR/credentials.json"

INSTALL_ROOT="/opt/conzex/uidrac-agent"
sudo mkdir -p "$INSTALL_ROOT"
sudo cp "$WORKDIR/agent-bundle.cjs" "$WORKDIR/credentials.json" "$INSTALL_ROOT/"
sudo cp "$WORKDIR/uidrac-agent.service" /etc/systemd/system/uidrac-agent.service
sudo sed -i "s|/opt/conzex/uidrac-agent|$INSTALL_ROOT|g" /etc/systemd/system/uidrac-agent.service 2>/dev/null || true
sudo systemctl daemon-reload
sudo systemctl enable uidrac-agent
sudo systemctl restart uidrac-agent
echo "UiDRAC agent installed. Portal → Agents → confirm Connected."
