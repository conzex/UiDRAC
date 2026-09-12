#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# launch-viewer.sh — Download and launch the appropriate iDRAC Java viewer.
# Called by the entrypoint after Xvfb and x11vnc are ready.
# Supports iDRAC 6 and 7 Java-based viewers.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

export DISPLAY=:99

IDRAC_URL="https://${IDRAC_HOST}"
VIEWER_DIR="/opt/idrac-viewer"

echo "Connecting to iDRAC at ${IDRAC_URL}..."

case "${IDRAC_GENERATION}" in
    "7")
        echo "iDRAC 7 — Downloading JNLP viewer..."

        # Download the JNLP file from iDRAC 7
        wget --no-check-certificate \
             --user="${IDRAC_USER}" \
             --password="${IDRAC_PASSWORD}" \
             -O "${VIEWER_DIR}/viewer.jnlp" \
             "${IDRAC_URL}/viewer.jnlp?type=0" \
             2>/dev/null || {
            echo "Failed to download JNLP. Trying alternative method..."

            # Alternative: authenticate first, then download
            # Get session cookie via login
            COOKIE_JAR="${VIEWER_DIR}/cookies.txt"
            curl -k -s \
                -c "${COOKIE_JAR}" \
                -d "user=${IDRAC_USER}&password=${IDRAC_PASSWORD}" \
                "${IDRAC_URL}/data/login" || true

            wget --no-check-certificate \
                 --load-cookies="${COOKIE_JAR}" \
                 -O "${VIEWER_DIR}/viewer.jnlp" \
                 "${IDRAC_URL}/viewer.jnlp?type=0" \
                 2>/dev/null || {
                echo "ERROR: Could not download JNLP from iDRAC 7"
                echo "Falling back to Firefox-based access..."
                firefox-esr --no-remote "${IDRAC_URL}" &
                wait
                exit 1
            }

            rm -f "${COOKIE_JAR}"
        }

        echo "Launching JNLP viewer..."

        # Disable Java security prompts for unsigned JARs
        mkdir -p /home/idrac/.java/deployment
        cat > /home/idrac/.java/deployment/deployment.properties << EOF
deployment.security.level=MEDIUM
deployment.security.mixcode=DISABLE
deployment.insecure.jres=ALWAYS
deployment.security.expired.certificate=true
deployment.security.jsse.hostmismatch.warning=false
deployment.security.https.warning.show=false
EOF

        # Launch Java Web Start viewer
        javaws -nosecurity "${VIEWER_DIR}/viewer.jnlp" 2>/tmp/javaws.log || {
            echo "javaws failed. Trying direct JAR execution..."
            cat /tmp/javaws.log

            # Try to extract JAR URLs from JNLP and run directly
            JAR_URL=$(grep -oP 'href="\K[^"]+\.jar' "${VIEWER_DIR}/viewer.jnlp" | head -1)
            if [ -n "${JAR_URL}" ]; then
                wget --no-check-certificate -O "${VIEWER_DIR}/viewer.jar" "${IDRAC_URL}/${JAR_URL}" 2>/dev/null
                java -jar "${VIEWER_DIR}/viewer.jar" \
                    -host "${IDRAC_HOST}" \
                    -user "${IDRAC_USER}" \
                    -passwd "${IDRAC_PASSWORD}" &
                wait
            else
                echo "ERROR: Could not extract JAR URL from JNLP"
                exit 1
            fi
        }
        ;;

    "6")
        echo "iDRAC 6 — Downloading legacy viewer..."

        # iDRAC 6 uses a different viewer mechanism
        # Try to download the Java viewer applet directly
        COOKIE_JAR="${VIEWER_DIR}/cookies.txt"

        # Authenticate to iDRAC 6
        curl -k -s \
            -c "${COOKIE_JAR}" \
            -d "user=${IDRAC_USER}&password=${IDRAC_PASSWORD}" \
            "${IDRAC_URL}/cgi-bin/webcgi/login" || {
            echo "WARNING: Login via CGI failed, trying alternative..."
            curl -k -s \
                -c "${COOKIE_JAR}" \
                -d "user=${IDRAC_USER}&password=${IDRAC_PASSWORD}" \
                "${IDRAC_URL}/data/login" || true
        }

        # Try to download the viewer JAR
        wget --no-check-certificate \
             --load-cookies="${COOKIE_JAR}" \
             -O "${VIEWER_DIR}/avctKVM.jar" \
             "${IDRAC_URL}/software/avctKVM.jar" \
             2>/dev/null || {
            echo "Direct JAR download failed. Trying JNLP method..."

            wget --no-check-certificate \
                 --load-cookies="${COOKIE_JAR}" \
                 -O "${VIEWER_DIR}/viewer.jnlp" \
                 "${IDRAC_URL}/viewer.jnlp" \
                 2>/dev/null || {
                echo "JNLP download also failed. Using Firefox fallback..."
                firefox-esr --no-remote "${IDRAC_URL}" &
                wait
                exit 1
            }

            javaws -nosecurity "${VIEWER_DIR}/viewer.jnlp" 2>/tmp/javaws.log &
            wait
            exit 0
        }

        echo "Launching iDRAC 6 KVM viewer..."

        # Extract session token from cookies
        SESSION_TOKEN=$(grep -oP 'SID=\K[^\s]+' "${COOKIE_JAR}" 2>/dev/null || echo "")

        java -cp "${VIEWER_DIR}/avctKVM.jar" \
            com.avocent.idrac.kvm.Main \
            ip="${IDRAC_HOST}" \
            user="${IDRAC_USER}" \
            passwd="${IDRAC_PASSWORD}" \
            kmport=5900 \
            vport=5900 \
            ${SESSION_TOKEN:+session=${SESSION_TOKEN}} \
            apcp=1 \
            version=2 \
            2>/tmp/kvm.log &
        KVM_PID=$!

        # Wait a moment and check if it started
        sleep 3
        if ! kill -0 $KVM_PID 2>/dev/null; then
            echo "KVM viewer failed to start. Logs:"
            cat /tmp/kvm.log
            echo "Falling back to Firefox..."
            firefox-esr --no-remote "${IDRAC_URL}" &
        fi

        wait
        rm -f "${COOKIE_JAR}"
        ;;

    *)
        echo "ERROR: Unsupported generation: ${IDRAC_GENERATION}"
        echo "This container supports iDRAC 6 and 7 only."
        echo "iDRAC 8/9 should use the native HTML5 console."
        exit 1
        ;;
esac

echo "Viewer process exited."
