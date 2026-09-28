#!/usr/bin/env bash
# Start (or restart) the macOS edge agent + local console on http://127.0.0.1:9742
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_JSON="${UIDRAC_AGENT_CONFIG:-$ROOT/tmp/uidrac-agent-darwin.json}"
BUNDLE="$ROOT/apps/edge-agent/macos/agent-bundle.cjs"
LOG="$ROOT/tmp/uidrac-agent.log"
PIDFILE="$ROOT/tmp/uidrac-agent.pid"

if [[ ! -f "$AGENT_JSON" ]]; then
  echo "Missing $AGENT_JSON — run ./scripts/fresh-docker.sh first or download agent JSON from Settings."
  exit 1
fi
if [[ ! -f "$BUNDLE" ]]; then
  echo "Missing agent bundle — run: pnpm --filter @idrac/edge-agent run build:mac-exe"
  exit 1
fi

pkill -f "apps/edge-agent/macos/agent-bundle.cjs" 2>/dev/null || true
sleep 1

export UIDRAC_AGENT_CONFIG="$AGENT_JSON"
export UIDRAC_AGENT_CONSOLE_DIR="$ROOT/apps/edge-agent/console/public"
export UIDRAC_AGENT_OPEN_UI="${UIDRAC_AGENT_OPEN_UI:-0}"

if command -v setsid >/dev/null 2>&1; then
  setsid node "$BUNDLE" >>"$LOG" 2>&1 &
else
  nohup node "$BUNDLE" >>"$LOG" 2>&1 &
fi
AGENT_PID=$!
disown "$AGENT_PID" 2>/dev/null || true
echo "$AGENT_PID" >"$PIDFILE"

for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:9742/ >/dev/null 2>&1; then
    echo "Agent console: http://127.0.0.1:9742 (pid $AGENT_PID)"
    exit 0
  fi
  sleep 1
done

echo "Console not up yet. tail -f $LOG"
exit 1
