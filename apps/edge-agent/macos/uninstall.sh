#!/usr/bin/env bash
# Copyright (c) 2026 Conzex Global Private Limited
set -euo pipefail

PLIST="/Library/LaunchDaemons/com.conzex.uidrac.agent.plist"
LABEL="com.conzex.uidrac.agent"
INSTALL_DIR="/Library/Application Support/Conzex/UiDRAC Agent"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if [[ -f "$PLIST" ]]; then
  launchctl bootout system "$PLIST" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
fi

rm -rf "$INSTALL_DIR"
echo "UiDRAC agent daemon removed. Config/logs under /Library/Application Support/Conzex/UiDRAC and /Library/Logs/Conzex were kept."
