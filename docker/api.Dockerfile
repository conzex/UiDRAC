# ═══════════════════════════════════════════════════════════════
# api.Dockerfile — Multi-stage NestJS build
# Produces a minimal Node.js image for the API backend.
# Targets: development (hot reload) | production (compiled JS)
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/edge-agent/package.json ./apps/edge-agent/
COPY apps/web/package.json ./apps/web/
COPY apps/console-gw/package.json ./apps/console-gw/
COPY packages/shared/package.json ./packages/shared/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build shared packages first, then API
RUN pnpm --filter @idrac/shared build && \
    pnpm --filter @idrac/adapters build && \
    pnpm --filter @idrac/api build

# ── Stage 3: Development (hot reload) ──
FROM node:20-alpine AS development
RUN apk add --no-cache python3 make g++ openssl libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

RUN pnpm db:generate

EXPOSE 4000

CMD ["pnpm", "--filter", "@idrac/api", "dev"]

# ── Stage 4: Production runner ──
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/packages/db/generated ./node_modules/@idrac/db/generated
COPY --from=builder /app/apps/api/package.json ./package.json

USER nestjs

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
