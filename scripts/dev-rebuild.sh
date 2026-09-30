#!/usr/bin/env bash
# Full local dev stack: typecheck, agent bundle, Docker down/up, smoke checks.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Typecheck (shared + adapters build)…"
pnpm --filter @idrac/shared build
pnpm --filter @idrac/adapters build
pnpm --filter @idrac/api typecheck
pnpm --filter @idrac/web typecheck

echo "==> Edge agent bundle…"
node apps/edge-agent/scripts/bundle-agent.mjs

echo "==> Docker: stop stack…"
docker compose down

echo "==> Docker: start postgres, redis, API, web, console gateway…"
docker compose up -d u-postgres u-redis u-api u-web u-console-gw

echo "==> Waiting for API health…"
for _ in $(seq 1 40); do
  if curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
    echo "API healthy."
    break
  fi
  sleep 2
done

if ! curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
  echo "ERROR: API did not become healthy. Logs:"
  docker compose logs u-api --tail 40
  exit 1
fi

check_route() {
  local path="$1"
  local label="$2"
  local body
  body="$(curl -s "http://localhost:4000${path}" || true)"
  if echo "$body" | grep -q Unauthorized; then
    echo "OK: ${label} (401 — route registered)"
  elif echo "$body" | grep -q 'Cannot GET'; then
    echo "FAIL: ${label} — route missing"
    exit 1
  else
    echo "WARN: ${label} — ${body:0:80}"
  fi
}

check_route "/api/servers/test/summary/dashboard" "summary/dashboard"
check_route "/api/servers/test/console/launch" "console/launch"

if curl -sf http://localhost:6080/health >/dev/null 2>&1; then
  echo "OK: console gateway"
else
  echo "WARN: console gateway not reachable on :6080"
fi

echo ""
echo "Done."
echo "  Portal:  http://localhost:3000"
echo "  API:     http://localhost:4000/api"
echo "  Console: http://localhost:6080"
