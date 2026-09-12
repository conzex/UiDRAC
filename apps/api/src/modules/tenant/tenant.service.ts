/** tenant.service.ts — Tenant management. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async update(tenantId: string, data: { name?: string }) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true },
    });
  }
}
