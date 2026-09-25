#!/usr/bin/env bash
# vm-prod.sh — Production stack on your VM (nginx + TLS + Docker Compose)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "No .env found."
  echo "  cp .env.selfhosted.example .env"
  echo "  bash scripts/generate-keys.sh   # paste secrets into .env"
  echo "  Edit PUBLIC_* URLs and TLS paths, then run this script again."
  exit 1
fi

if [[ ! -f nginx/certs/fullchain.pem ]] || [[ ! -f nginx/certs/privkey.pem ]]; then
  echo "Missing TLS files in nginx/certs/"
  echo "  Use Let's Encrypt (see docs/DEPLOYMENT.md) or a self-signed pair:"
  echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
  echo "    -keyout nginx/certs/privkey.pem -out nginx/certs/fullchain.pem \\"
  echo "    -subj '/CN=idrac.yourdomain.com'"
  exit 1
fi

echo "Building legacy console image (iDRAC 6/7)…"
docker build -f docker/idrac-legacy.Dockerfile -t uidrac:legacy .

echo "Starting production stack…"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Waiting for health (via nginx :80)…"
for i in $(seq 1 60); do
  if curl -sfk "http://127.0.0.1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "Universal iDRAC Console (production)"
echo "  Update nginx/nginx.conf server_name if you use a custom domain."
echo "  Portal:  \${PUBLIC_APP_URL from .env}"
echo "  Health:  curl -sk https://YOUR_HOST/api/health"
echo ""
docker compose -f docker-compose.prod.yml ps
