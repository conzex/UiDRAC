/** audit.service.ts — Audit log service. */
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../packages/db/generated/client';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string | null, query?: { page?: number; pageSize?: number; action?: string }) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 25;
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (query?.action) where.action = query.action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: where as any, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } }, server: { select: { name: true } } },
      }),
      this.prisma.auditLog.count({ where: where as any }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(tenantId: string, userId: string, action: string, payload: Record<string, unknown> = {}, ip = '0.0.0.0', serverId?: string) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        payload: payload as Prisma.InputJsonValue,
        ip,
        serverId,
      },
    });
  }
}
