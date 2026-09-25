import { Logger } from '@nestjs/common';
import { ensurePlatformAdmin } from '@idrac/db';
import { PrismaService } from '../prisma.service';

const log = new Logger('PlatformAdminBootstrap');

export async function bootstrapPlatformAdmin(prisma: PrismaService): Promise<void> {
  const result = await ensurePlatformAdmin(prisma, {
    onLog: (line) => log.warn(line),
  });
  if (result === 'created') {
    log.warn('Default credentials: admin / admin (or PLATFORM_ADMIN_PASSWORD if set).');
  }
}
