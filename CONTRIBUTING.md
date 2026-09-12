# Contributing to Universal iDRAC Console

Thank you for your interest in contributing! This document provides guidelines
and instructions for contributing to the Universal iDRAC Console project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Adding a New iDRAC Generation](#adding-a-new-idrac-generation)
- [Testing](#testing)

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/universal-idrac-console.git
cd universal-idrac-console

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your local values

# Generate Prisma client
pnpm db:generate

# Start development services (Postgres + Redis)
docker compose up postgres redis -d

# Run database migrations
pnpm db:migrate

# Seed the database (no-op — app starts with a clean database)
pnpm db:seed

# Start all apps in development mode
pnpm dev
```

### Development URLs

| Service      | URL                        |
|-------------|----------------------------|
| Frontend    | http://localhost:3000       |
| API         | http://localhost:4000       |
| API Docs    | http://localhost:4000/docs  |
| Console GW  | http://localhost:6080       |
| Prisma Studio| http://localhost:5555      |

## Project Structure

```
universal-idrac-console/
├── apps/
│   ├── web/            # Next.js 15 frontend
│   ├── api/            # NestJS backend
│   └── console-gw/     # Console gateway (noVNC bridge)
├── packages/
│   ├── adapters/       # iDRAC adapter library
│   ├── ui/             # Shared React components
│   ├── db/             # Prisma schema & migrations
│   └── shared/         # Types, schemas, constants
├── docker/             # Dockerfiles
├── nginx/              # Nginx configuration
├── infra/              # Traefik & infrastructure config
└── scripts/            # Utility scripts
```

## Code Style

We use Prettier for formatting and ESLint for linting.

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check

# Lint
pnpm lint
```

### Rules

- **TypeScript** everywhere — no `.js` files in `src/`
- **Consistent type imports** — use `import type { Foo }` for type-only imports
- **Header comments** — every file must have a comment explaining its role
- **No `any`** — use `unknown` and narrow with type guards
- **No `console.log`** — use the logger service (warn and error are allowed)

## Branch Naming

```
feature/   — new features (feature/add-idrac10-support)
fix/       — bug fixes (fix/console-timeout-handling)
chore/     — maintenance (chore/upgrade-nestjs)
docs/      — documentation (docs/add-api-examples)
refactor/  — code refactoring (refactor/adapter-factory)
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test`
4. Write a clear PR description explaining what and why
5. Request review from at least one maintainer
6. Squash merge once approved

## Adding a New iDRAC Generation

To add support for a new iDRAC generation (e.g., iDRAC 10):

1. **Update constants** in `packages/shared/src/constants.ts`:
   ```typescript
   export const IDRAC_GENERATIONS = ['6', '7', '8', '9', '10'] as const;
   ```

2. **Create adapter** in `packages/adapters/src/`:
   ```typescript
   // packages/adapters/src/idrac10-adapter.ts
   export class Idrac10Adapter implements IdracAdapter {
     readonly generation = '10' as const;
     // implement all methods...
   }
   ```

3. **Register in factory** in `packages/adapters/src/factory.ts`:
   ```typescript
   case '10': return new Idrac10Adapter(credentials);
   ```

4. **Update detection** in `probeGeneration()` to detect the new generation

5. **Update Prisma schema** — add `GEN10` to `IdracGen` enum

6. **Add tests** — at minimum, test all adapter methods

7. **Update frontend** — add generation badge color in `generation-badge.tsx`

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @idrac/adapters test

# Run tests in watch mode
pnpm --filter @idrac/adapters test -- --watch

# Run with coverage
pnpm test -- --coverage
```
