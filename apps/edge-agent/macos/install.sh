#!/usr/bin/env bash
# Conzex UiDRAC Agent — macOS LaunchDaemon install
# Copyright (c) 2026 Conzex Global Private Limited. All rights reserved.
set -euo pipefail

CONFIG=""
INSTALL_DIR="/Library/Application Support/Conzex/UiDRAC Agent"
DATA_DIR="/Library/Application Support/Conzex/UiDRAC"
LOG_DIR="/Library/Logs/Conzex"
PLIST="/Library/LaunchDaemons/com.conzex.uidrac.agent.plist"
LABEL="com.conzex.uidrac.agent"

usage() {
  echo "Usage: sudo $0 --config /path/to/uidrac-agent-darwin.json" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) shift ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0 --config <json>" >&2
  exit 1
fi

if [[ -z "$CONFIG" || ! -f "$CONFIG" ]]; then
  echo "Missing or unreadable config: $CONFIG" >&2
  usage
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" == "$INSTALL_DIR" ]]; then
  AGENT_BIN="$INSTALL_DIR/uidrac-agent"
else
  mkdir -p "$INSTALL_DIR"
  for f in uidrac-agent agent-bundle.cjs install.sh uninstall.sh CONZEX-EULA.txt COPYRIGHT.txt; do
    if [[ -f "$SCRIPT_DIR/$f" ]]; then
      cp -f "$SCRIPT_DIR/$f" "$INSTALL_DIR/$f"
      chmod 755 "$INSTALL_DIR/$f" 2>/dev/null || true
    fi
  done
  if [[ -d "$SCRIPT_DIR/console/public" ]]; then
    mkdir -p "$INSTALL_DIR/console/public"
    cp -f "$SCRIPT_DIR/console/public/"* "$INSTALL_DIR/console/public/" 2>/dev/null || true
  elif [[ -d "$SCRIPT_DIR/../console/public" ]]; then
    mkdir -p "$INSTALL_DIR/console/public"
    cp -f "$SCRIPT_DIR/../console/public/"* "$INSTALL_DIR/console/public/" 2>/dev/null || true
  fi
  AGENT_BIN="$INSTALL_DIR/uidrac-agent"
fi

mkdir -p "$DATA_DIR" "$LOG_DIR"
chmod 755 "$DATA_DIR" "$LOG_DIR"
cp -f "$CONFIG" "$DATA_DIR/agent.json"
chmod 600 "$DATA_DIR/agent.json"

# Local API fallback for Docker / localhost portal (agent tries 127.0.0.1:4000 before cloud URL).
LOCAL_URL_ENV=""
LOCAL_WS_ENV=""
if command -v python3 >/dev/null 2>&1; then
  read -r LOCAL_URL_ENV LOCAL_WS_ENV < <(python3 - "$DATA_DIR/agent.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    d = json.load(f)
local = d.get("localUrl") or ""
local_ws = d.get("localWsUrl") or ""
cloud = d.get("cloudUrl") or ""
embed = d.get("enableLocalFallback")
if embed is False:
    print("", "")
elif local:
    print(local, local_ws or "ws://127.0.0.1:4000/api/agent/ws")
elif cloud and "localhost" not in cloud and "127.0.0.1" not in cloud:
    print("http://127.0.0.1:4000", "ws://127.0.0.1:4000/api/agent/ws")
else:
    print("", "")
PY
)
fi

if [[ ! -x "$AGENT_BIN" ]] && [[ ! -f "$INSTALL_DIR/agent-bundle.cjs" ]]; then
  if command -v node >/dev/null 2>&1; then
    cat >"$INSTALL_DIR/run-uidrac-agent.sh" <<EOF
#!/usr/bin/env bash
export UIDRAC_AGENT_CONFIG="$DATA_DIR/agent.json"
export IDRAC_AGENT_CONFIG="$DATA_DIR/agent.json"
cd "$INSTALL_DIR"
exec npx --yes @idrac/edge-agent
EOF
    chmod 755 "$INSTALL_DIR/run-uidrac-agent.sh"
    AGENT_BIN="$INSTALL_DIR/run-uidrac-agent.sh"
  else
    echo "Missing uidrac-agent binary. Build with scripts/build-edge-agent-macos.sh or install Node.js 20+." >&2
    exit 1
  fi
fi

if launchctl print "system/$LABEL" &>/dev/null; then
  launchctl bootout system "$PLIST" 2>/dev/null || true
fi

# Build a PATH that includes common Node.js install locations
DAEMON_PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
# If the current shell has extra dirs (e.g. nvm, volta), pull them in too
for d in $(echo "${PATH:-}" | tr ':' ' '); do
  case "$DAEMON_PATH" in *"$d"*) ;; *) DAEMON_PATH="$DAEMON_PATH:$d" ;; esac
done

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$AGENT_BIN</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$DAEMON_PATH</string>
    <key>UIDRAC_AGENT_CONFIG</key>
    <string>$DATA_DIR/agent.json</string>
    <key>IDRAC_AGENT_CONFIG</key>
    <string>$DATA_DIR/agent.json</string>
    <key>UIDRAC_AGENT_UI</key>
    <string>0</string>
    <key>UIDRAC_AGENT_CONSOLE_DIR</key>
    <string>$INSTALL_DIR/console/public</string>
$(if [[ -n "$LOCAL_URL_ENV" ]]; then
  echo "    <key>UIDRAC_LOCAL_URL</key>"
  echo "    <string>$LOCAL_URL_ENV</string>"
  echo "    <key>UIDRAC_LOCAL_WS_URL</key>"
  echo "    <string>${LOCAL_WS_ENV:-ws://127.0.0.1:4000/api/agent/ws}</string>"
fi)
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/uidrac-agent.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/uidrac-agent.err.log</string>
</dict>
</plist>
EOF
chmod 644 "$PLIST"
chown root:wheel "$PLIST"

launchctl bootstrap system "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"
launchctl kickstart -k "system/$LABEL" 2>/dev/null || true

echo "Conzex UiDRAC Agent — Copyright (c) 2026 Conzex Global Private Limited"
echo "Installed. Config: $DATA_DIR/agent.json"
echo "Logs: $LOG_DIR/uidrac-agent.log"
echo "Agent console: sign in to the portal → Agents → manage this connector."
echo "Verify Connected in portal → Agents (refresh every few seconds)."
echo "If Terminal shows getcwd errors, open a new window and use full paths (see README in the ZIP)."
