/**
 * seed.ts — Bootstrap default super admin account.
 * Creates the default admin/admin credentials on first run.
 * Safe to run multiple times — skips if admin already exists.
 *
 * To run: pnpm db:seed
 */
import { PrismaClient } from '../generated/client';
import { ensurePlatformAdmin } from './ensure-platform-admin';

const prisma = new PrismaClient();

async function main() {
  const result = await ensurePlatformAdmin(prisma, {
    onLog: (line) => console.log(`✅ ${line}`),
  });
  if (result === 'exists') {
    console.log('ℹ️  Super admin already exists. Skipping.');
    return;
  }
  console.log('   Username: admin');
  console.log('   Password: admin (or PLATFORM_ADMIN_PASSWORD)');
  console.log('   ⚠️  Change this password after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
