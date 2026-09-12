# Architectural Decisions

> This document records all significant architectural and technology decisions made
> during the development of Universal iDRAC Console. Each decision includes context,
> the choice made, and the rationale.

---

## ADR-001: Monorepo with pnpm Workspaces + Turborepo

**Context:** We need a multi-app, multi-package codebase with shared types and components.

**Decision:** Use pnpm workspaces for package management and Turborepo for task orchestration.

**Rationale:**
- pnpm's strict dependency resolution prevents phantom dependencies
- Workspace protocol (`workspace:*`) ensures packages always use local versions
- Turborepo provides cached, parallel builds with minimal config
- Both are battle-tested in production monorepos (Vercel, Meta)
- Faster than Nx for our use case (no need for computation caching server)

---

## ADR-002: NestJS for the API Layer

**Context:** Need a structured Node.js backend with modules, dependency injection, guards, and WebSocket support.

**Decision:** Use NestJS with Express adapter.

**Rationale:**
- Built-in module system maps cleanly to our domain (auth, servers, console, audit)
- First-class support for WebSockets (Socket.IO gateway)
- Guards and interceptors enable clean RBAC and audit logging
- Swagger/OpenAPI generation out of the box
- Large ecosystem and community
- Express adapter (not Fastify) for maximum middleware compatibility

---

## ADR-003: Prisma for Database Access

**Context:** Need a type-safe ORM for PostgreSQL with migrations.

**Decision:** Use Prisma with PostgreSQL 16.

**Rationale:**
- Generated TypeScript types from schema ensure compile-time safety
- Migration system is simple and reliable
- Prisma Studio for development/debugging
- Better DX than TypeORM (schema-first vs decorator-first)
- More mature than Drizzle for complex queries
- PostgreSQL 16 for JSONB, array types, and excellent performance

---

## ADR-004: Next.js 15 App Router for Frontend

**Context:** Need a React-based frontend with SSR capability and good DX.

**Decision:** Use Next.js 15 with App Router, TypeScript, and Tailwind CSS.

**Rationale:**
- App Router provides file-based routing matching our URL structure
- Server Components for initial loads; Client Components for interactivity
- Standalone output mode for small Docker images
- Tailwind enables pixel-perfect Dell iDRAC 9 theme implementation
- shadcn/ui for accessible, customizable components
- Excellent TypeScript integration

---

## ADR-005: shadcn/ui + Custom Dell Theme

**Context:** Need professional UI components that can be themed to match Dell iDRAC 9 Enterprise.

**Decision:** Use shadcn/ui with extensive theme customization.

**Rationale:**
- Components are copied into the project (not a dependency) — full control
- Built on Radix UI primitives — excellent accessibility
- Tailwind-based — easy to override with Dell design tokens
- All components are headless enough to match any visual language
- 2px border radius, Open Sans font, Dell blue palette applied globally

---

## ADR-006: noVNC + Docker Containers for Legacy Console

**Context:** iDRAC 6/7 use Java Web Start / ActiveX which modern browsers refuse. Need zero-client-install solution.

**Decision:** Run Java viewers inside Docker containers with Xvfb + x11vnc, stream to browser via noVNC.

**Rationale:**
- Customers never install Java, ActiveX, or any plugin
- Container isolation provides security boundaries
- noVNC is the industry standard for browser-based VNC
- x11vnc captures the virtual X framebuffer with low latency
- Containers are ephemeral — spawned on demand, auto-cleaned
- Java 8 (Eclipse Temurin) in container for legacy viewer compatibility
- ~600MB image is acceptable for the capability provided

---

## ADR-007: AES-256-GCM for iDRAC Credential Encryption

**Context:** Customer iDRAC credentials must be stored encrypted at rest.

**Decision:** Encrypt with AES-256-GCM using a master key from environment.

**Rationale:**
- AES-256-GCM provides authenticated encryption (confidentiality + integrity)
- GCM mode is faster than CBC and prevents padding oracle attacks
- Master key stored in environment (Docker secrets in production)
- Each credential gets a unique random IV (12 bytes)
- Authentication tag prevents tampering
- Credentials decrypted only in-memory when adapter needs them

---

## ADR-008: argon2id for User Password Hashing

**Context:** Need secure password hashing for platform user accounts.

**Decision:** Use argon2id with recommended parameters.

**Rationale:**
- argon2id is the winner of the Password Hashing Competition
- Resistant to both GPU and side-channel attacks
- Recommended by OWASP over bcrypt and scrypt
- Parameters: memory=64MB, iterations=3, parallelism=4

---

## ADR-009: JWT + Rotating Refresh Tokens

**Context:** Need stateless authentication with secure session management.

**Decision:** Short-lived JWT access tokens (15 min) + long-lived rotating refresh tokens (7 days) stored as httpOnly cookies.

**Rationale:**
- Access tokens are stateless — no DB lookup per request
- 15-minute expiry limits damage from token theft
- Refresh tokens are hashed in Postgres — revocable per-session
- Rotation on every refresh prevents token replay
- httpOnly cookie prevents XSS-based token theft

---

## ADR-010: Redis for Session Credentials and Pub/Sub

**Context:** Need temporary credential storage and real-time WebSocket fanout.

**Decision:** Use Redis 7 for session-mode credentials and Socket.IO pub/sub.

**Rationale:**
- Session-mode credentials live in Redis with 30-min TTL (auto-expire)
- Never touch disk — maximum security for transient credentials
- Redis pub/sub enables multi-instance WebSocket fanout
- Socket.IO Redis adapter for horizontal scaling
- Simple, well-understood, operationally boring (good)

---

## ADR-011: dockerode for Container Management

**Context:** Console gateway needs to spawn/manage Docker containers programmatically.

**Decision:** Use dockerode (Node.js Docker API client) with mounted docker.sock.

**Rationale:**
- dockerode is the most mature Node.js Docker library
- Direct Docker socket access avoids HTTP API overhead
- Container lifecycle management (create, start, stop, remove)
- Event streams for container health monitoring
- Alternatives (kubernetes-client) are overkill for single-host deployment

---

## ADR-012: Multi-Strategy Adapter Pattern

**Context:** Three different iDRAC generations with completely different APIs need a unified interface.

**Decision:** Strategy pattern with one interface, three implementations, and a factory.

**Rationale:**
- Clean separation: business logic doesn't know which generation it's talking to
- Easy to add new generations (implement interface, register in factory)
- Auto-detection probes endpoints in order to determine generation
- Each strategy handles its own quirks internally

---

## ADR-013: Tenant Isolation

**Context:** Multi-tenant SaaS must prevent data leakage between tenants.

**Decision:** Row-level tenant isolation with tenantId on every table, enforced at the service layer.

**Rationale:**
- Simpler than database-per-tenant for our scale
- Every query filters by tenantId extracted from JWT
- Unique constraints include tenantId (e.g., unique [tenantId, ip])
- Guards prevent horizontal privilege escalation
- Can migrate to schema-per-tenant later if needed
