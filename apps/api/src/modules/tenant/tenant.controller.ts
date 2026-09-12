/** tenant.controller.ts — Tenant endpoints. */
import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get()
  findOne(@Req() req: any) { return this.tenantService.findOne(req.user?.tenantId); }

  @Patch()
  update(@Req() req: any, @Body() body: { name?: string }) { return this.tenantService.update(req.user?.tenantId, body); }

  @Get('users')
  getUsers(@Req() req: any) { return this.tenantService.getUsers(req.user?.tenantId); }
}
