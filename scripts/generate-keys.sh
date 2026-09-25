#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# generate-keys.sh — Generate all required secrets for .env
# Run this script to populate your .env with cryptographically
# secure random keys.
# Usage: ./scripts/generate-keys.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "🔑 Generating secrets for Universal iDRAC Console..."
echo ""

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
MASTER_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n/+=')

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
echo "# Optional (cloud / edge agent only):"
echo "AGENT_SIGNING_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""
echo "✅ Done! Copy the values above into your .env file."
echo "⚠️  NEVER commit these values to version control."
