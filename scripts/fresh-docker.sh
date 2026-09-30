#!/usr/bin/env bash
# Remove all uidrac containers and volumes, rebuild, bootstrap agent JSON, start edge agent
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Stopping and removing uidrac containers + volumes ==="
docker compose down -v --remove-orphans 2>/dev/null || true

echo "=== Building and starting stack ==="
docker compose up -d --build

echo "=== Waiting for API ==="
for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
    echo "API healthy."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "API did not become healthy in time. Check: docker logs uidrac-api"
    exit 1
  fi
  sleep 3
done

echo "=== Fetching tenant-locked agent credentials ==="
LOGIN_JSON=$(curl -sf -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin","password":"admin"}')
TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.accessToken||'')" "$LOGIN_JSON")
if [[ -z "$TOKEN" ]]; then
  echo "Login failed. Response: $LOGIN_JSON"
  exit 1
fi

AGENT_JSON="$ROOT/tmp/uidrac-agent-darwin.json"
mkdir -p "$ROOT/tmp"
curl -sf "http://localhost:4000/api/agent/download?platform=darwin&format=json" \
  -H "Authorization: Bearer $TOKEN" \
  -o "$AGENT_JSON"

echo "=== Building local macOS agent binary ==="
pnpm --filter @idrac/edge-agent run build:mac-exe

echo "=== Starting UiDRAC edge agent ==="
pkill -f "apps/edge-agent/macos/agent-bundle.cjs" 2>/dev/null || true
pkill -f "edge-agent/macos/uidrac-agent" 2>/dev/null || true
sleep 1

export UIDRAC_AGENT_CONFIG="$AGENT_JSON"

# Detached start so the agent survives after this script exits (Cursor/sandbox shells may SIGHUP job children).
if command -v setsid >/dev/null 2>&1; then
  setsid node "$ROOT/apps/edge-agent/macos/agent-bundle.cjs" >>"$ROOT/tmp/uidrac-agent.log" 2>&1 &
else
  nohup node "$ROOT/apps/edge-agent/macos/agent-bundle.cjs" >>"$ROOT/tmp/uidrac-agent.log" 2>&1 &
fi
AGENT_PID=$!
disown "$AGENT_PID" 2>/dev/null || true
echo "$AGENT_PID" >"$ROOT/tmp/uidrac-agent.pid"

for i in $(seq 1 30); do
  if kill -0 "$AGENT_PID" 2>/dev/null && curl -sf http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo ""
    echo "=== Ready ==="
    echo "  Portal:              http://localhost:3000  (login: admin / admin)"
    echo "  API:                 http://localhost:4000/api"
    echo "  UiDRAC Agent console: Agents → manage → UiDRAC Agent console"
    echo "  Agent config:        $AGENT_JSON"
    echo "  Agent log:           $ROOT/tmp/uidrac-agent.log"
    echo ""
    echo "  Restart agent: $ROOT/scripts/start-local-agent.sh"
    docker compose ps
    exit 0
  fi
  sleep 1
done

echo "Agent or API not ready. Log:"
tail -30 "$ROOT/tmp/uidrac-agent.log" || true
exit 1
