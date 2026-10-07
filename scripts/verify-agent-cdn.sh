#!/usr/bin/env bash
# Check that public CDN objects match portal expectations.
set -euo pipefail
export LC_ALL=C LANG=C

BASE="${1:-${AGENT_CDN_BASE_URL:-https://cdn.conzex.com/uidrac/agent}}"
BASE="${BASE%/}"

REQUIRED=(
  UidracAgent.pkg
  UidracAgentSetup.exe
  UidracAgent-linux.sh
  agent-bundle.cjs
  uidrac-agent.service
)

FORBIDDEN=(
  credentials.json
)

echo "CDN base: $BASE"
echo ""

ok=0
fail=0
for name in "${REQUIRED[@]}"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/$name" 2>/dev/null) || code="000"
  if [[ "$code" == "200" ]]; then
    echo "  OK   $name"
    ok=$((ok + 1))
  else
    echo "  MISS $name (HTTP $code)"
    fail=$((fail + 1))
  fi
done

echo ""
for name in "${FORBIDDEN[@]}"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/$name" 2>/dev/null) || code="000"
  if [[ "$code" == "200" ]]; then
    echo "  WARN $name is PUBLIC on CDN — delete it (tenant secrets belong in portal only)."
    fail=$((fail + 1))
  fi
done

echo ""
if [[ "$fail" -eq 0 ]]; then
  echo "All required portal CDN files are reachable."
else
  echo "$ok/${#REQUIRED[@]} required files OK; fix missing items (see apps/edge-agent/installer/CDN-PORTAL-FILES.md)."
  exit 1
fi
