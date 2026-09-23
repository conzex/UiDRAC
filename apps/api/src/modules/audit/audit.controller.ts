/** audit.controller.ts — Audit log endpoints. */
import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma.service';

const SYSTEM_SLUG = 'system';

@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService, private prisma: PrismaService) {}

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user?.tenantId ?? '' } });
    const tenantId = (tenant?.slug === SYSTEM_SLUG && req.user?.role === 'OWNER') ? null : req.user?.tenantId;
    return this.audit.findAll(tenantId, query);
  }
}
