# ═══════════════════════════════════════════════════════════════
# console-gw.Dockerfile — Console Gateway service
# Node.js service that manages legacy iDRAC console containers.
# Requires Docker socket mount for container management.
# Targets: development (tsx watch) | production (compiled JS)
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps

RUN apk add --no-cache docker-cli

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy ALL workspace package.json files so pnpm lockfile resolves
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/console-gw/package.json ./apps/console-gw/
COPY packages/shared/package.json ./packages/shared/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Development (hot reload) ──
FROM node:20-alpine AS development

RUN apk add --no-cache docker-cli

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 6080

CMD ["pnpm", "--filter", "@idrac/console-gw", "dev"]

# ── Stage 3: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter @idrac/shared build && \
    pnpm --filter @idrac/console-gw build

# ── Stage 4: Production ──
FROM node:20-alpine AS production

RUN apk add --no-cache docker-cli

WORKDIR /app

RUN addgroup -S consolegw && adduser -S consolegw -G consolegw

COPY --from=builder /app/apps/console-gw/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/console-gw/package.json ./package.json

EXPOSE 6080
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
