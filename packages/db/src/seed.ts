/**
 * seed.ts — Bootstrap default super admin account.
 * Creates the default admin/admin credentials on first run.
 * Safe to run multiple times — skips if admin already exists.
 *
 * To run: pnpm db:seed
 */
import { PrismaClient } from '../generated/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { email: 'admin' } });
  if (existing) {
    console.log('ℹ️  Super admin already exists. Skipping.');
    return;
  }

  const passwordHash = await argon2.hash('admin', { type: argon2.argon2id });

  const tenant = await prisma.tenant.create({
    data: { name: 'System', slug: 'system' },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin',
      passwordHash,
      role: 'OWNER',
    },
  });

  console.log('✅ Default super admin created:');
  console.log('   Username: admin');
  console.log('   Password: admin');
  console.log('   ⚠️  Change this password after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
