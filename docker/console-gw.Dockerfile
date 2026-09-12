# ═══════════════════════════════════════════════════════════════
# console-gw.Dockerfile — Console Gateway service
# Node.js service that manages legacy iDRAC console containers.
# Requires Docker socket mount for container management.
# ═══════════════════════════════════════════════════════════════

FROM node:20-alpine

# Install Docker CLI (needed for dockerode to manage containers)
RUN apk add --no-cache docker-cli

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/console-gw/package.json ./apps/console-gw/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/console-gw/ ./apps/console-gw/
COPY packages/shared/ ./packages/shared/

# Build
RUN pnpm --filter @idrac/shared build && \
    pnpm --filter @idrac/console-gw build

# Non-root user (but needs docker group access)
RUN addgroup -S consolegw && adduser -S consolegw -G consolegw

EXPOSE 6080

ENV NODE_ENV=production

# Note: Container must be started with docker.sock mounted
# docker run -v /var/run/docker.sock:/var/run/docker.sock ...

CMD ["node", "apps/console-gw/dist/index.js"]
