#!/usr/bin/env bash
# Stage every file for https://cdn.conzex.com/uidrac/agent/ (all 3 OS installers + Linux deps).
# Output: cdn-agent/ at repo root — upload to https://cdn.conzex.com/uidrac/agent/
set -euo pipefail
# Avoid macOS perl locale noise from shasum when LANG is a custom Apple locale.
export LC_ALL=C
export LANG=C

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(grep "^export const APP_VERSION" packages/shared/src/version.ts | sed -n "s/.*'\\([^']*\\)'.*/\\1/p")"
STAGE="$ROOT/cdn-agent"
CDN_PREFIX="${CDN_PREFIX:-uidrac/agent}"

echo "=== UiDRAC agent CDN staging (v${VERSION}) ==="
echo "    Target path on CDN: /${CDN_PREFIX}/"
echo ""

mkdir -p "$STAGE"
# Remove previous generated artifacts only (keep README.md + .gitignore)
find "$STAGE" -maxdepth 1 -type f ! -name 'README.md' ! -name '.gitignore' -delete 2>/dev/null || true

echo ">> Building Node agent bundles (macOS + Windows cjs)..."
pnpm --filter @idrac/edge-agent run build:win-bundle

echo ">> Linux support files..."
cp -f "$ROOT/apps/edge-agent/linux/UidracAgent-linux.sh" "$STAGE/UidracAgent-linux.sh"
cp -f "$ROOT/apps/edge-agent/linux/uidrac-agent.service" "$STAGE/uidrac-agent.service"
cp -f "$ROOT/apps/edge-agent/macos/agent-bundle.cjs" "$STAGE/agent-bundle.cjs"
chmod +x "$STAGE/UidracAgent-linux.sh"

echo ">> macOS UidracAgent.pkg..."
PKG_SRC="$ROOT/apps/edge-agent/macos/out/UidracAgent.pkg"
if [[ ! -f "$PKG_SRC" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    VERSION="$VERSION" "$ROOT/scripts/build-edge-agent-macos.sh"
  else
    echo "   WARN: No UidracAgent.pkg — build on macOS: VERSION=$VERSION scripts/build-edge-agent-macos.sh"
  fi
fi
if [[ -f "$PKG_SRC" ]]; then
  cp -f "$PKG_SRC" "$STAGE/UidracAgent.pkg"
else
  echo "   SKIP: UidracAgent.pkg not present"
fi

echo ">> Windows UidracAgentSetup.exe..."
WIN_CANDIDATES=(
  "${WIN_EXE:-}"
  "$ROOT/apps/edge-agent/installer/out/UidracAgentSetup.exe"
)
WIN_OK=0
for f in "${WIN_CANDIDATES[@]}"; do
  [[ -n "$f" && -f "$f" ]] || continue
  cp -f "$f" "$STAGE/UidracAgentSetup.exe"
  WIN_OK=1
  echo "   OK: $f"
  break
done
MSI_SRC="$ROOT/apps/edge-agent/installer/out/uidrac-agent-setup.msi"
if [[ -f "$MSI_SRC" ]]; then
  cp -f "$MSI_SRC" "$STAGE/uidrac-agent-setup.msi"
  echo "   OK: uidrac-agent-setup.msi (API download only, not on public CDN)"
fi

if [[ "$WIN_OK" -eq 0 ]]; then
  echo "   MISSING: UidracAgentSetup.exe (cannot build Inno EXE on macOS)"
  echo "   Option A — Windows PC: pwsh -File scripts/build-edge-agent-installer.ps1"
  echo "   Option B — GitHub: Actions → \"Build UiDRAC Agent (Windows)\" → download artifact"
  echo "            then: WIN_EXE=/path/to/UidracAgentSetup.exe pnpm agent:cdn-stage"
fi

MANIFEST="$STAGE/MANIFEST.json"
{
  echo '{'
  echo "  \"product\": \"Universal iDRAC Console — UiDRAC Agent\","
  echo "  \"version\": \"${VERSION}\","
  echo "  \"cdnPath\": \"/${CDN_PREFIX}/\","
  echo "  \"generatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\","
  echo '  "files": ['
  first=1
  for name in UidracAgent.pkg UidracAgentSetup.exe UidracAgent-linux.sh agent-bundle.cjs uidrac-agent.service; do
    path="$STAGE/$name"
    if [[ -f "$path" ]]; then
      bytes=$(wc -c <"$path" | tr -d ' ')
      if command -v openssl >/dev/null 2>&1; then
        sha=$(openssl dgst -sha256 "$path" | awk '{print $NF}')
      elif command -v shasum >/dev/null 2>&1; then
        sha=$(shasum -a 256 "$path" | awk '{print $1}')
      else
        sha=$(sha256sum "$path" | awk '{print $1}')
      fi
      [[ "$first" -eq 1 ]] || echo ','
      first=0
      printf '    {"name":"%s","bytes":%s,"sha256":"%s"}' "$name" "$bytes" "$sha"
    fi
  done
  echo ''
  echo '  ]'
  echo '}'
} >"$MANIFEST"

cat >"$STAGE/UPLOAD-README.txt" <<EOF
Upload everything in this folder to your CDN:

  https://cdn.conzex.com/${CDN_PREFIX}/

Required objects (public, no tenant secrets):

  UidracAgent.pkg          — macOS installer (portal download)
  UidracAgentSetup.exe     — Windows installer (portal download)
  UidracAgent-linux.sh     — Linux installer script (portal download)
  agent-bundle.cjs         — Linux agent runtime (fetched by linux script)
  uidrac-agent.service     — Linux systemd unit (fetched by linux script)

Tenant credentials stay on the portal (Agents → download), never on CDN.

Example (rsync):

  rsync -avz --progress cdn-agent/ user@cdn-host:/var/www/cdn/${CDN_PREFIX}/

Example (AWS S3):

  aws s3 sync cdn-agent/ s3://YOUR-BUCKET/${CDN_PREFIX}/ \\
    --acl public-read \\
    --cache-control "public, max-age=3600"

Set AGENT_CDN_BASE_URL on API/web if you use a non-default host.

See apps/edge-agent/installer/CDN-PUBLISH.md for full notes.
EOF

echo ""
echo "=== Staged files ==="
ls -la "$STAGE"
echo ""
REQUIRED=(UidracAgent.pkg UidracAgentSetup.exe UidracAgent-linux.sh agent-bundle.cjs uidrac-agent.service)
MISSING=()
for name in "${REQUIRED[@]}"; do
  [[ -f "$STAGE/$name" ]] || MISSING+=("$name")
done
if [[ ${#MISSING[@]} -eq 0 ]]; then
  echo "CDN set complete (5/5). Upload: $STAGE"
else
  echo "CDN set partial (${#MISSING[@]} missing): ${MISSING[*]}"
  echo "You may upload now for macOS/Linux; add Windows EXE before Windows customers install."
  echo "Upload folder: $STAGE"
fi
echo "Manifest: $MANIFEST"
