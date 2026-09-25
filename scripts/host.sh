#!/usr/bin/env bash
# host.sh — Build and start Universal iDRAC Console (Docker)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — run: cp .env.example .env"
  echo "Then: bash scripts/generate-keys.sh --write"
  exit 1
fi

echo "Building and starting services (postgres, redis, api, web, console-gw)…"
if ! docker image inspect uidrac:legacy >/dev/null 2>&1; then
  echo "Building legacy console image (first run)…"
  docker build -f docker/idrac-legacy.Dockerfile -t uidrac:legacy .
fi
docker compose up -d --build

echo ""
echo "Waiting for API health…"
for i in $(seq 1 30); do
  if curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "Universal iDRAC Console (development compose)"
echo "  Portal:  http://localhost:3000"
echo "  API:     http://localhost:4000/api"
echo "  Health:  http://localhost:4000/api/health"
echo ""
echo "Production on a VM:  cp .env.selfhosted.example .env  &&  bash scripts/vm-prod.sh"
echo "  See README.md and docs/DEPLOYMENT.md"
echo ""
docker compose ps
