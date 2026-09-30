#!/usr/bin/env bash
# Start (or restart) the macOS edge agent for local Docker dev.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_JSON="${UIDRAC_AGENT_CONFIG:-$ROOT/tmp/uidrac-agent-darwin.json}"
BUNDLE="$ROOT/apps/edge-agent/macos/agent-bundle.cjs"
LOG="$ROOT/tmp/uidrac-agent.log"
PIDFILE="$ROOT/tmp/uidrac-agent.pid"

if [[ ! -f "$AGENT_JSON" ]]; then
  echo "Missing $AGENT_JSON — run ./scripts/fresh-docker.sh first or download agent JSON from Agents."
  exit 1
fi
if [[ ! -f "$BUNDLE" ]]; then
  echo "Missing agent bundle — run: node apps/edge-agent/scripts/bundle-agent.mjs"
  exit 1
fi

pkill -f "apps/edge-agent/macos/agent-bundle.cjs" 2>/dev/null || true
sleep 1

export UIDRAC_AGENT_CONFIG="$AGENT_JSON"

if command -v setsid >/dev/null 2>&1; then
  setsid node "$BUNDLE" >>"$LOG" 2>&1 &
else
  nohup node "$BUNDLE" >>"$LOG" 2>&1 &
fi
AGENT_PID=$!
disown "$AGENT_PID" 2>/dev/null || true
echo "$AGENT_PID" >"$PIDFILE"

echo "Edge agent started (pid $AGENT_PID). UiDRAC Agent console: http://localhost:3000 → Agents."
echo "Log: tail -f $LOG"
