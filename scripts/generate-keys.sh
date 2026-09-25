#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# generate-keys.sh — Generate all required secrets for .env
# Usage:
#   ./scripts/generate-keys.sh           # print keys (copy into .env)
#   ./scripts/generate-keys.sh --write   # create/update .env in place
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WRITE=false
if [[ "${1:-}" == "--write" ]]; then
  WRITE=true
fi

echo "🔑 Generating secrets for Universal iDRAC Console..."
echo ""

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
MASTER_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=')
AGENT_SIGNING_SECRET=$(openssl rand -base64 64 | tr -d '\n')

if [[ "$WRITE" == true ]]; then
  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      cp .env.example .env
      echo "Created .env from .env.example"
    else
      echo "ERROR: No .env or .env.example found." >&2
      exit 1
    fi
  fi
  python3 <<PY
from pathlib import Path
import re

path = Path(".env")
text = path.read_text()
updates = {
    "JWT_SECRET": "${JWT_SECRET}",
    "REFRESH_SECRET": "${REFRESH_SECRET}",
    "MASTER_ENCRYPTION_KEY": "${MASTER_KEY}",
    "POSTGRES_PASSWORD": "${POSTGRES_PASSWORD}",
}
for key, val in updates.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    if pattern.search(text):
        text = pattern.sub(f"{key}={val}", text)
    else:
        text = text.rstrip() + f"\n{key}={val}\n"
user = "idrac"
m = re.search(r"^POSTGRES_USER=(.+)$", text, re.M)
if m:
    user = m.group(1).strip()
db = "idrac"
m = re.search(r"^POSTGRES_DB=(.+)$", text, re.M)
if m:
    db = m.group(1).strip()
url = f"postgresql://{user}:${POSTGRES_PASSWORD}@postgres:5432/{db}"
if re.search(r"^POSTGRES_URL=.*$", text, re.M):
    text = re.sub(r"^POSTGRES_URL=.*$", f"POSTGRES_URL={url}", text, flags=re.M)
else:
    text = text.rstrip() + f"\nPOSTGRES_URL={url}\n"
path.write_text(text)
PY
  echo "✅ Wrote new secrets to .env (values not printed)."
  echo "⚠️  NEVER commit .env. Restart Docker if the stack is already running."
  exit 0
fi

echo "# Add these to your .env file:"
echo ""
echo "JWT_SECRET=${JWT_SECRET}"
echo ""
echo "REFRESH_SECRET=${REFRESH_SECRET}"
echo ""
echo "MASTER_ENCRYPTION_KEY=${MASTER_KEY}"
echo ""
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
echo ""
echo "POSTGRES_URL=postgresql://idrac:${POSTGRES_PASSWORD}@postgres:5432/idrac"
echo ""
echo "# Optional (cloud / edge agent only):"
echo "AGENT_SIGNING_SECRET=${AGENT_SIGNING_SECRET}"
echo ""
echo "✅ Done! Copy the values above into your .env file."
echo "   Or run: bash scripts/generate-keys.sh --write"
echo "⚠️  NEVER commit these values to version control."
