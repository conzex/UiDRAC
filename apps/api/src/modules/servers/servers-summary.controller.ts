/** Batched iDRAC page loads — registered separately so routes are never shadowed by GET :id. */
import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ServersService } from './servers.service';
import { Roles } from '../auth/decorators';
import { PrismaService } from '../../prisma.service';
import { SYSTEM_TENANT_SLUG } from '../../common/rbac.constants';

@Controller('servers/:serverId/summary')
@Roles('VIEWER')
export class ServersSummaryController {
  constructor(
    private servers: ServersService,
    private prisma: PrismaService,
  ) {}

  private async tenantId(req: { user?: { tenantId?: string; role?: string } }): Promise<string | null> {
    const tid = req.user?.tenantId;
    if (!tid) return '';
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid } });
    if (tenant?.slug === SYSTEM_TENANT_SLUG && req.user?.role === 'OWNER') return null;
    return tid;
  }

  private refreshFlag(refresh?: string) {
    return refresh === 'true' || refresh === '1';
  }

  @Post('warm')
  async warm(
    @Param('serverId') id: string,
    @Query('refresh') refresh: string | undefined,
    @Req() req: unknown,
  ) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.warmAllSummaries(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('dashboard')
  async dashboard(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getDashboardSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('system')
  async system(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getSystemSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('storage')
  async storage(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getStorageSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('maintenance')
  async maintenance(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getMaintenanceSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('maintenance/diagnostics')
  async maintenanceDiagnostics(
    @Param('serverId') id: string,
    @Query('refresh') refresh: string | undefined,
    @Req() req: unknown,
  ) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getMaintenanceDiagnosticsSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('power')
  async power(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getPowerSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('configuration')
  async configuration(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getConfigurationSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('idrac-settings/advanced')
  async idracSettingsAdvanced(
    @Param('serverId') id: string,
    @Query('refresh') refresh: string | undefined,
    @Req() req: unknown,
  ) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getIdracSettingsAdvancedSummary(id, tenantId, this.refreshFlag(refresh));
  }

  @Get('idrac-settings')
  async idracSettings(@Param('serverId') id: string, @Query('refresh') refresh: string | undefined, @Req() req: unknown) {
    const tenantId = await this.tenantId(req as { user?: { tenantId?: string; role?: string } });
    return this.servers.getIdracSettingsSummary(id, tenantId, this.refreshFlag(refresh));
  }
}
