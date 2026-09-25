/** Platform admin API — super-admin only; no iDRAC credential exposure. */
import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators';

@Controller('admin')
@Roles('OWNER')
export class AdminController {
  constructor(private admin: AdminService) {}

  private actor(req: any) {
    return { sub: req.user.id, tenantId: req.user.tenantId, role: req.user.role };
  }

  @Get('users')
  listUsers(@Req() req: any) {
    return this.admin.listUsers(this.actor(req));
  }

  @Delete('users/:id')
  deleteUser(@Req() req: any, @Param('id') id: string) {
    return this.admin.deleteUser(this.actor(req), id);
  }

  @Post('users/:id/reset-password')
  resetPassword(@Req() req: any, @Param('id') id: string) {
    return this.admin.resetUserPassword(this.actor(req), id);
  }

  @Get('tenants')
  listTenants(@Req() req: any) {
    return this.admin.listTenants(this.actor(req));
  }

  @Patch('tenants/:id')
  updateTenant(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; plan?: string }) {
    return this.admin.updateTenant(this.actor(req), id, body);
  }

  @Delete('tenants/:id')
  deleteTenant(@Req() req: any, @Param('id') id: string) {
    return this.admin.deleteTenant(this.actor(req), id);
  }

  @Get('servers')
  listServers(@Req() req: any) {
    return this.admin.listServerInventory(this.actor(req));
  }

  @Delete('servers/:id')
  deleteServer(@Req() req: any, @Param('id') id: string) {
    return this.admin.deleteServer(this.actor(req), id);
  }

  @Get('audit')
  listAudit(@Req() req: any) {
    return this.admin.listAudit(this.actor(req));
  }

  @Delete('audit/:id')
  deleteAudit(@Req() req: any, @Param('id') id: string) {
    return this.admin.deleteAudit(this.actor(req), id);
  }
}
