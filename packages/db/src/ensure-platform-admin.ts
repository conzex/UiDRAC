/**
 * Ensures the default platform super-admin exists (system tenant, OWNER).
 * Safe to call on every API startup and from db seed.
 */
import type { PrismaClient } from '../generated/client';
import * as argon2 from 'argon2';
import { PRIMARY_PLATFORM_ADMIN_EMAIL } from '@idrac/shared';

export const SYSTEM_TENANT_SLUG = 'system';

type PrismaLike = Pick<PrismaClient, 'user' | 'tenant'>;

export async function ensurePlatformAdmin(
  prisma: PrismaLike,
  options?: { password?: string; onLog?: (line: string) => void },
): Promise<'created' | 'exists'> {
  const log = options?.onLog ?? (() => undefined);
  const existing = await prisma.user.findFirst({ where: { email: PRIMARY_PLATFORM_ADMIN_EMAIL } });
  if (existing) return 'exists';

  let tenant = await prisma.tenant.findUnique({ where: { slug: SYSTEM_TENANT_SLUG } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: 'System', slug: SYSTEM_TENANT_SLUG } });
  }

  const password = options?.password ?? process.env.PLATFORM_ADMIN_PASSWORD ?? 'admin';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: PRIMARY_PLATFORM_ADMIN_EMAIL,
      passwordHash,
      role: 'OWNER',
    },
  });

  log(`Platform admin created (sign-in: ${PRIMARY_PLATFORM_ADMIN_EMAIL}). Change the default password after first login.`);
  return 'created';
}
