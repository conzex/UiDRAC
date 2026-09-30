#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# release.sh — Bump version, revoke sessions, rebuild & restart
# Usage: ./scripts/release.sh [patch|minor|major]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BUMP_TYPE="${1:-patch}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "═══════════════════════════════════════════════"
echo " Releasing: v${CURRENT} → v${NEW_VERSION} (${BUMP_TYPE})"
echo "═══════════════════════════════════════════════"

# 1. Bump all package.json files
for PKG in \
  package.json \
  apps/web/package.json \
  apps/api/package.json \
  apps/console-gw/package.json \
  packages/shared/package.json \
  packages/db/package.json \
  packages/adapters/package.json \
  packages/ui/package.json; do
  if [ -f "$PKG" ]; then
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('$PKG', 'utf8'));
      pkg.version = '$NEW_VERSION';
      fs.writeFileSync('$PKG', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "  ✓ $PKG"
  fi
done

# 2. Update version.ts
cat > packages/shared/src/version.ts << EOF
/**
 * Central application version — updated by scripts/release.sh (do not edit by hand).
 */
export const APP_VERSION = '${NEW_VERSION}';

export const APP_VERSION_LABEL = \`v\${APP_VERSION}\`;
EOF
echo "  ✓ packages/shared/src/version.ts"

# 3. Update version state
if [ -f ".idrac-version-state.json" ]; then
  node -e "
    const fs = require('fs');
    const state = JSON.parse(fs.readFileSync('.idrac-version-state.json', 'utf8'));
    state.version = '$NEW_VERSION';
    state.changeCount = 0;
    fs.writeFileSync('.idrac-version-state.json', JSON.stringify(state, null, 2) + '\n');
  "
  echo "  ✓ .idrac-version-state.json"
fi

# 4. Git commit and tag
echo ""
echo "Committing version bump..."
git add -A
git commit -m "chore: release v${NEW_VERSION}" || echo "(no changes to commit)"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}" 2>/dev/null || echo "(tag already exists)"

# 5. Push to GitHub
echo "Pushing to origin..."
git push && git push --tags

# 6. Rebuild and restart Docker
echo ""
echo "Rebuilding Docker containers..."
if [ -f "docker-compose.prod.yml" ]; then
  docker compose -f docker-compose.prod.yml build
  docker compose -f docker-compose.prod.yml up -d
else
  docker compose build
  docker compose up -d
fi

# 7. Wait for API
echo "Waiting for API..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
    echo "  ✓ API is healthy"
    break
  fi
  sleep 3
done

# 8. Revoke all sessions
echo ""
echo "Revoking all active sessions..."
docker compose exec -T u-api node -e "
  const { PrismaClient } = require('./packages/db/generated/client');
  const prisma = new PrismaClient();
  prisma.session.deleteMany({}).then(r => {
    console.log('  ✓ Revoked ' + r.count + ' session(s)');
    process.exit(0);
  }).catch(e => {
    console.error('  ✗ Failed:', e.message);
    process.exit(1);
  });
" 2>/dev/null || echo "  (session revocation will happen on next cleanup cycle)"

echo ""
echo "═══════════════════════════════════════════════"
echo " ✅ Released v${NEW_VERSION}"
echo "    All sessions revoked — users must re-login"
echo "═══════════════════════════════════════════════"
