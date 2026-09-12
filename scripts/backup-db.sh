#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# backup-db.sh — Backup PostgreSQL database to a timestamped file.
# Usage: ./scripts/backup-db.sh [output-dir]
# Requires: docker compose to be running with postgres service
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${OUTPUT_DIR}/idrac_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

echo "🗃️  Backing up Universal iDRAC Console database..."
echo "   Output: ${BACKUP_FILE}"

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-idrac}" \
  -d "${POSTGRES_DB:-idrac}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup complete: ${BACKUP_FILE} (${SIZE})"
echo ""
echo "To restore: gunzip -c ${BACKUP_FILE} | docker compose exec -T postgres psql -U idrac -d idrac"
