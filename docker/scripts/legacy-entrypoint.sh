#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# legacy-entrypoint.sh — Entrypoint for the legacy iDRAC console container.
# Starts Xvfb, openbox, x11vnc, and the iDRAC Java viewer.
# Environment variables are set by console-gw at container creation time.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "═══════════════════════════════════════════════════"
echo " Universal iDRAC Console — Legacy Viewer Container"
echo " Generation: ${IDRAC_GENERATION:-unknown}"
echo " Target: ${IDRAC_HOST:-unset}"
echo "═══════════════════════════════════════════════════"

# Validate required environment variables
if [ -z "${IDRAC_HOST:-}" ]; then
    echo "ERROR: IDRAC_HOST is required"
    exit 1
fi

if [ -z "${IDRAC_USER:-}" ]; then
    echo "ERROR: IDRAC_USER is required"
    exit 1
fi

if [ -z "${IDRAC_PASSWORD:-}" ]; then
    echo "ERROR: IDRAC_PASSWORD is required"
    exit 1
fi

if [ -z "${IDRAC_GENERATION:-}" ]; then
    echo "ERROR: IDRAC_GENERATION is required (6 or 7)"
    exit 1
fi

RESOLUTION="${SCREEN_RESOLUTION:-1280x1024x24}"
VNC_PORT="${VNC_PORT:-5900}"

# ── Step 1: Start Xvfb (virtual framebuffer) ──
echo "[1/4] Starting Xvfb on display :99 at ${RESOLUTION}..."
Xvfb :99 -screen 0 "${RESOLUTION}" -ac -nolisten tcp &
XVFB_PID=$!
sleep 1

# Verify Xvfb is running
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "ERROR: Xvfb failed to start"
    exit 1
fi

echo "  ✓ Xvfb running (PID: $XVFB_PID)"

# ── Step 2: Start openbox (minimal window manager) ──
echo "[2/4] Starting openbox window manager..."
DISPLAY=:99 openbox &
sleep 0.5
echo "  ✓ openbox running"

# ── Step 3: Start x11vnc ──
echo "[3/4] Starting x11vnc on port ${VNC_PORT}..."
x11vnc \
    -display :99 \
    -rfbport "${VNC_PORT}" \
    -nopw \
    -shared \
    -forever \
    -noxdamage \
    -noxfixes \
    -cursor arrow \
    -bg \
    -o /tmp/x11vnc.log

sleep 0.5

# Verify x11vnc is running
if ! pgrep x11vnc > /dev/null; then
    echo "ERROR: x11vnc failed to start"
    cat /tmp/x11vnc.log 2>/dev/null
    exit 1
fi

echo "  ✓ x11vnc running on port ${VNC_PORT}"

# ── Step 4: Launch iDRAC viewer ──
echo "[4/4] Launching iDRAC viewer..."
/opt/launch-viewer.sh &
VIEWER_PID=$!

echo ""
echo "═══════════════════════════════════════════════════"
echo " Container ready! VNC available on port ${VNC_PORT}"
echo "═══════════════════════════════════════════════════"

# ── Idle monitoring ──
# Check every 60 seconds if there are active VNC connections.
# After IDLE_TIMEOUT seconds with no connections, exit gracefully.
IDLE_TIMEOUT="${IDLE_TIMEOUT:-1800}"
IDLE_COUNT=0

while true; do
    sleep 60

    # Check if viewer process is still running
    if ! kill -0 $VIEWER_PID 2>/dev/null; then
        echo "Viewer process exited. Shutting down container."
        break
    fi

    # Check VNC connections
    VNC_CLIENTS=$(x11vnc -query clients 2>/dev/null | grep -c "client" || echo "0")

    if [ "$VNC_CLIENTS" = "0" ]; then
        IDLE_COUNT=$((IDLE_COUNT + 60))
        if [ "$IDLE_COUNT" -ge "$IDLE_TIMEOUT" ]; then
            echo "No VNC clients for ${IDLE_TIMEOUT}s. Shutting down."
            break
        fi
    else
        IDLE_COUNT=0
    fi
done

# Cleanup
echo "Cleaning up..."
kill $VIEWER_PID 2>/dev/null || true
kill $XVFB_PID 2>/dev/null || true
killall x11vnc 2>/dev/null || true
killall openbox 2>/dev/null || true

echo "Container shutdown complete."
exit 0
