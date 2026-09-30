/** Platform admin API — super-admin only; no iDRAC credential exposure. */
import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/decorators';

@Controller('admin')
@Roles('OWNER')
export class AdminController {
  constructor(private admin: AdminService, private audit: AuditService) {}

  private actor(req: any) {
    return { sub: req.user.id, tenantId: req.user.tenantId, role: req.user.role };
  }

  private ip(req: any): string {
    return (
      (req.headers?.['cf-connecting-ip'] as string)?.trim() ||
      (req.headers?.['true-client-ip'] as string)?.trim() ||
      (req.headers?.['x-real-ip'] as string)?.trim() ||
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip || '0.0.0.0'
    );
  }

  @Get('users')
  listUsers(@Req() req: any) {
    return this.admin.listUsers(this.actor(req));
  }

  @Delete('users/:id')
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    const result = await this.admin.deleteUser(this.actor(req), id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.delete_user', { targetUserId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post('users/:id/reset-password')
  async resetPassword(@Req() req: any, @Param('id') id: string) {
    const result = await this.admin.resetUserPassword(this.actor(req), id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.reset_password', { targetUserId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Get('tenants')
  listTenants(@Req() req: any) {
    return this.admin.listTenants(this.actor(req));
  }

  @Patch('tenants/:id')
  async updateTenant(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; plan?: string }) {
    const result = await this.admin.updateTenant(this.actor(req), id, body);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.update_tenant', { targetTenantId: id, changes: Object.keys(body) }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Delete('tenants/:id')
  async deleteTenant(@Req() req: any, @Param('id') id: string) {
    const result = await this.admin.deleteTenant(this.actor(req), id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.delete_tenant', { targetTenantId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Get('servers')
  listServers(@Req() req: any) {
    return this.admin.listServerInventory(this.actor(req));
  }

  @Delete('servers/:id')
  async deleteServer(@Req() req: any, @Param('id') id: string) {
    const result = await this.admin.deleteServer(this.actor(req), id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.delete_server', { serverId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Get('audit')
  listAudit(@Req() req: any) {
    return this.admin.listAudit(this.actor(req));
  }

  @Delete('audit/:id')
  async deleteAudit(@Req() req: any, @Param('id') id: string) {
    const result = await this.admin.deleteAudit(this.actor(req), id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.delete_audit_entry', { auditLogId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Get('agents/stats')
  agentStats(@Req() req: any) {
    return this.admin.agentProvisioningStats(this.actor(req));
  }

  @Post('sessions/revoke-all')
  async revokeAllSessions(@Req() req: any) {
    const result = await this.admin.revokeAllSessions(this.actor(req));
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.revoke_all_sessions', { count: result.count }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post('smtp/test')
  async testSmtp(
    @Req() req: any,
    @Body() body: { host: string; port: number; secure: boolean; user?: string; pass?: string; from: string; testRecipient?: string },
  ) {
    const result = await this.admin.testSmtp(body);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'admin.smtp_test', { host: body.host, success: result.success }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }
}
