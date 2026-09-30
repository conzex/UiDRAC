#!/usr/bin/env bash
# Point an installed macOS agent at localhost API (Docker) when the bundle still targets production cloud.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run: sudo $0" >&2
  exit 1
fi

INSTALL_DIR="/Library/Application Support/Conzex/UiDRAC Agent"
PLIST="/Library/LaunchDaemons/com.conzex.uidrac.agent.plist"
LABEL="com.conzex.uidrac.agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/agent-bundle.cjs" ]]; then
  cp -f "$SCRIPT_DIR/agent-bundle.cjs" "$INSTALL_DIR/agent-bundle.cjs"
  chmod 755 "$INSTALL_DIR/agent-bundle.cjs"
  echo "Updated agent-bundle.cjs"
fi

if [[ -f "$SCRIPT_DIR/install.sh" ]]; then
  cp -f "$SCRIPT_DIR/install.sh" "$INSTALL_DIR/install.sh"
fi

for key in UIDRAC_LOCAL_URL UIDRAC_LOCAL_WS_URL; do
  /usr/libexec/PlistBuddy -c "Delete :EnvironmentVariables:$key" "$PLIST" 2>/dev/null || true
done
/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:UIDRAC_LOCAL_URL string http://127.0.0.1:4000" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:UIDRAC_LOCAL_WS_URL string ws://127.0.0.1:4000/api/agent/ws" "$PLIST"

launchctl bootout system "$PLIST" 2>/dev/null || true
launchctl bootstrap system "$PLIST"
launchctl kickstart -k "system/$LABEL"

echo "Agent restarted with local API fallback (127.0.0.1:4000)."
echo "Check Agents in the portal (UiDRAC Agent console)."
