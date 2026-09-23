/** tenant.controller.ts — Tenant endpoints. Super admin sees all. */
import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaService } from '../../prisma.service';
import { Roles } from '../auth/decorators';
import { SYSTEM_TENANT_SLUG } from '../../common/rbac.constants';

const SYSTEM_SLUG = SYSTEM_TENANT_SLUG;

@Controller('tenant')
@Roles('VIEWER')
export class TenantController {
  constructor(private tenantService: TenantService, private prisma: PrismaService) {}

  private async isSuperAdmin(req: any): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user?.tenantId ?? '' } });
    return tenant?.slug === SYSTEM_SLUG && req.user?.role === 'OWNER';
  }

  @Get()
  async findOne(@Req() req: any) {
    if (await this.isSuperAdmin(req)) {
      return this.tenantService.findAll();
    }
    return this.tenantService.findOne(req.user?.tenantId);
  }

  @Patch()
  @Roles('ADMIN')
  update(@Req() req: any, @Body() body: { name?: string }) { return this.tenantService.update(req.user?.tenantId, body); }

  @Get('users')
  async getUsers(@Req() req: any) {
    const tenantId = (await this.isSuperAdmin(req)) ? null : req.user?.tenantId;
    return this.tenantService.getUsers(tenantId);
  }
}
