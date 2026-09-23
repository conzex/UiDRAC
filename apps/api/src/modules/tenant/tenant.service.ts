/** tenant.service.ts — Tenant management. Super admin sees all tenants. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(tenantId: string, data: { name?: string }) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async getUsers(tenantId: string | null) {
    const where = tenantId ? { tenantId } : {};
    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true, tenantId: true, createdAt: true, lastLoginAt: true, tenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
