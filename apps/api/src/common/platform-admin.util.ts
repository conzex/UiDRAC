/** System super-admin check (system tenant + OWNER). */
import { PrismaService } from '../prisma.service';
import { SYSTEM_TENANT_SLUG } from './rbac.constants';

export async function isPlatformSuperAdmin(prisma: PrismaService, user: { tenantId?: string; role?: string } | undefined): Promise<boolean> {
  if (!user?.tenantId || user.role !== 'OWNER') return false;
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  return tenant?.slug === SYSTEM_TENANT_SLUG;
}
