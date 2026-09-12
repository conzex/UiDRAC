# ═══════════════════════════════════════════════════════════════
# idrac-legacy.Dockerfile — Legacy iDRAC Console Container
# Runs Java-based iDRAC viewers (iDRAC 6/7) inside a container
# with a virtual X display, streamed via VNC to the browser.
#
# Image size: ~600MB (Java 8 + X11 + Firefox)
# This is acceptable for the zero-client-install capability.
# ═══════════════════════════════════════════════════════════════

FROM eclipse-temurin:8-jre-jammy

# Prevent interactive prompts during package install
ENV DEBIAN_FRONTEND=noninteractive

# Install X11, VNC, window manager, and browser dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    openbox \
    python3 \
    python3-pip \
    websockify \
    firefox-esr \
    wget \
    curl \
    ca-certificates \
    libxtst6 \
    libxrender1 \
    libxi6 \
    libxext6 \
    libx11-6 \
    libxcb1 \
    libxau6 \
    libxdmcp6 \
    libfontconfig1 \
    libfreetype6 \
    fonts-dejavu-core \
    dbus-x11 \
    procps \
    net-tools \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for running the viewer
RUN useradd -m -s /bin/bash idrac

# Create required directories
RUN mkdir -p /tmp/.X11-unix /home/idrac/.vnc /opt/idrac-viewer \
    && chown -R idrac:idrac /home/idrac /opt/idrac-viewer

# Copy entrypoint script
COPY docker/scripts/legacy-entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

# Copy helper script for downloading and launching iDRAC viewers
COPY docker/scripts/launch-viewer.sh /opt/launch-viewer.sh
RUN chmod +x /opt/launch-viewer.sh

# Environment variables (set by console-gw at runtime)
ENV DISPLAY=:99
ENV IDRAC_HOST=""
ENV IDRAC_USER=""
ENV IDRAC_PASSWORD=""
ENV IDRAC_GENERATION=""
ENV VNC_PORT=5900
ENV SCREEN_RESOLUTION=1280x1024x24

# Expose VNC port
EXPOSE 5900

USER idrac
WORKDIR /home/idrac

ENTRYPOINT ["/opt/entrypoint.sh"]
