/**
 * @idrac/db — Database client and utilities for the Universal iDRAC Console.
 * Re-exports the generated Prisma client and provides a singleton instance.
 */

export { PrismaClient } from '../generated/client';
export type {
  Tenant,
  User,
  Server,
  Session,
  ConsoleSession,
  AuditLog,
  UserRole,
  IdracGen,
  CredentialMode,
  HealthStatus,
} from '../generated/client';

import { PrismaClient } from '../generated/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Singleton Prisma client instance.
 * In development, this survives hot reloads by caching on globalThis.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

export { ensurePlatformAdmin, SYSTEM_TENANT_SLUG } from './ensure-platform-admin';

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
