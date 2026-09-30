#!/usr/bin/env bash
# Build and run Conzex SaaS production stack (agent-required cloud mode).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — run: cp .env.saas.example .env && bash scripts/generate-keys.sh --write"
  exit 1
fi

echo "==> Typecheck & agent bundle…"
pnpm --filter @idrac/shared build
pnpm --filter @idrac/adapters build
pnpm --filter @idrac/api typecheck
pnpm --filter @idrac/web typecheck
node apps/edge-agent/scripts/bundle-agent.mjs

echo "==> Docker build & up (prod + SaaS overlay)…"
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml build
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml up -d

echo "==> Waiting for API…"
for _ in $(seq 1 60); do
  if docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml exec -T u-api wget -q -O- http://localhost:4000/api/health 2>/dev/null | grep -q ok; then
    echo "API healthy."
    exit 0
  fi
  sleep 2
done

echo "API not healthy — logs:"
docker compose -f docker-compose.prod.yml -f docker-compose.saas.yml logs u-api --tail 50
exit 1
