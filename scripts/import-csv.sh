#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# import-csv.sh — Import servers from a CSV file.
# CSV format: ip,username,password,name (header row required)
# Usage: ./scripts/import-csv.sh <csv-file> [api-url] [auth-token]
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

CSV_FILE="${1:?Usage: $0 <csv-file> [api-url] [auth-token]}"
API_URL="${2:-http://localhost:4000}"
AUTH_TOKEN="${3:?Please provide an auth token as the third argument}"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ File not found: $CSV_FILE"
  exit 1
fi

echo "📥 Importing servers from: $CSV_FILE"
echo "🔗 API URL: $API_URL"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

# Skip header row, read CSV
tail -n +2 "$CSV_FILE" | while IFS=',' read -r ip username password name; do
  TOTAL=$((TOTAL + 1))

  # Trim whitespace
  ip=$(echo "$ip" | xargs)
  username=$(echo "$username" | xargs)
  password=$(echo "$password" | xargs)
  name=$(echo "$name" | xargs)

  # Default name if empty
  if [ -z "$name" ]; then
    name="Server-${ip}"
  fi

  echo -n "  → Adding ${name} (${ip})... "

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${API_URL}/api/servers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "{
      \"name\": \"${name}\",
      \"ip\": \"${ip}\",
      \"username\": \"${username}\",
      \"password\": \"${password}\",
      \"credentialsMode\": \"saved\"
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Success"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "❌ Failed (HTTP ${HTTP_CODE})"
    echo "     ${BODY}" | head -1
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "📊 Import complete: ${SUCCESS} succeeded, ${FAILED} failed out of ${TOTAL} total"
