/** audit.controller.ts — Audit log endpoints. */
import { Controller, Get, Query, Req } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.audit.findAll(req.user?.tenantId, query);
  }
}
