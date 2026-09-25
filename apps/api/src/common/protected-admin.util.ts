/** Primary seeded platform administrator — must never be deleted. */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PRIMARY_PLATFORM_ADMIN_EMAIL } from '@idrac/shared';
import { SYSTEM_TENANT_SLUG } from './rbac.constants';

export async function assertUserMayBeDeleted(prisma: PrismaService, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!user) throw new NotFoundException('User not found');
  if (user.email === PRIMARY_PLATFORM_ADMIN_EMAIL && user.tenant.slug === SYSTEM_TENANT_SLUG) {
    throw new ForbiddenException('The primary platform administrator account cannot be deleted.');
  }
}
