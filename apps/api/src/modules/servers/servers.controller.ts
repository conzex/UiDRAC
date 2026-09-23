/** servers.controller.ts — Full iDRAC server management endpoints. */
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ServersService } from './servers.service';
import { Public, Roles } from '../auth/decorators';
import { PrismaService } from '../../prisma.service';
import { SYSTEM_TENANT_SLUG } from '../../common/rbac.constants';

const SYSTEM_SLUG = SYSTEM_TENANT_SLUG;

@Controller('servers')
@Roles('VIEWER')
export class ServersController {
  constructor(private servers: ServersService, private prisma: PrismaService) {}

  private async tenantId(req: any): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user?.tenantId ?? '' } });
    if (tenant?.slug === SYSTEM_SLUG && req.user?.role === 'OWNER') return null;
    return req.user?.tenantId ?? '';
  }

  // ── CRUD ──

  @Get()
  async findAll(@Req() req: any, @Query() query: any) { return this.servers.findAll(await this.tenantId(req), query); }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) { return this.servers.findOne(id, await this.tenantId(req)); }

  @Post()
  @Roles('OPERATOR')
  create(@Body() body: any, @Req() req: any) { return this.servers.create(req.user?.tenantId, body); }

  @Patch(':id')
  @Roles('OPERATOR')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.servers.update(id, await this.tenantId(req), body); }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Req() req: any) { return this.servers.remove(id, await this.tenantId(req)); }

  @Public()
  @Post('probe')
  probe(@Body() body: { ip: string; username: string; password: string }) { return this.servers.probe(body.ip, body.username, body.password); }

  // ── Core ──

  @Get(':id/health')
  async getHealth(@Param('id') id: string, @Req() req: any) { return this.servers.getHealth(id, await this.tenantId(req)); }

  @Get(':id/system')
  async getSystem(@Param('id') id: string, @Req() req: any) { return this.servers.getSystemInfo(id, await this.tenantId(req)); }

  @Get(':id/storage')
  async getStorage(@Param('id') id: string, @Req() req: any) { return this.servers.getStorage(id, await this.tenantId(req)); }

  @Get(':id/network')
  async getNetwork(@Param('id') id: string, @Req() req: any) { return this.servers.getNetwork(id, await this.tenantId(req)); }

  @Get(':id/firmware')
  async getFirmware(@Param('id') id: string, @Req() req: any) { return this.servers.getFirmware(id, await this.tenantId(req)); }

  @Get(':id/sensors')
  async getSensors(@Param('id') id: string, @Req() req: any) { return this.servers.getSensors(id, await this.tenantId(req)); }

  @Get(':id/sel')
  async getSel(@Param('id') id: string, @Req() req: any) { return this.servers.getSel(id, await this.tenantId(req)); }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string, @Req() req: any) { return this.servers.getLogs(id, await this.tenantId(req)); }

  // ── Power ──

  @Post(':id/power')
  @Roles('OPERATOR')
  async powerAction(@Param('id') id: string, @Body() body: { action: string }, @Req() req: any) {
    return this.servers.powerAction(id, await this.tenantId(req), body.action);
  }

  @Get(':id/power/readings')
  async getPowerReadings(@Param('id') id: string, @Req() req: any) { return this.servers.getPowerReadings(id, await this.tenantId(req)); }

  @Get(':id/thermal')
  async getThermal(@Param('id') id: string, @Req() req: any) { return this.servers.getThermal(id, await this.tenantId(req)); }

  @Patch(':id/power/cap')
  @Roles('OPERATOR')
  async setPowerCap(@Param('id') id: string, @Body() body: { watts: number | null }, @Req() req: any) {
    return this.servers.setPowerCap(id, await this.tenantId(req), body.watts);
  }

  @Post(':id/identify')
  @Roles('OPERATOR')
  async setIdentify(@Param('id') id: string, @Body() body: { on: boolean }, @Req() req: any) {
    return this.servers.setIdentify(id, await this.tenantId(req), body.on);
  }

  // ── BIOS ──

  @Get(':id/bios')
  async getBiosConfig(@Param('id') id: string, @Req() req: any) { return this.servers.getBiosConfig(id, await this.tenantId(req)); }

  @Patch(':id/bios')
  @Roles('OPERATOR')
  async setBiosAttributes(@Param('id') id: string, @Body() body: { attributes: Record<string, string> }, @Req() req: any) {
    return this.servers.setBiosAttributes(id, await this.tenantId(req), body.attributes);
  }

  @Patch(':id/boot-order')
  @Roles('OPERATOR')
  async setBootOrder(@Param('id') id: string, @Body() body: { order: string[] }, @Req() req: any) {
    return this.servers.setBootOrder(id, await this.tenantId(req), body.order);
  }

  // ── iDRAC Users ──

  @Get(':id/idrac-users')
  async getIdracUsers(@Param('id') id: string, @Req() req: any) { return this.servers.getIdracUsers(id, await this.tenantId(req)); }

  @Post(':id/idrac-users')
  @Roles('ADMIN')
  async createIdracUser(@Param('id') id: string, @Body() body: { name: string; password: string; privilege: string }, @Req() req: any) {
    return this.servers.createIdracUser(id, await this.tenantId(req), body.name, body.password, body.privilege);
  }

  @Delete(':id/idrac-users/:userId')
  @Roles('ADMIN')
  async deleteIdracUser(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    return this.servers.deleteIdracUser(id, await this.tenantId(req), parseInt(userId));
  }

  @Patch(':id/idrac-users/:userId/password')
  @Roles('ADMIN')
  async updateIdracUserPassword(@Param('id') id: string, @Param('userId') userId: string, @Body() body: { password: string }, @Req() req: any) {
    return this.servers.updateIdracUserPassword(id, await this.tenantId(req), parseInt(userId), body.password);
  }

  // ── Virtual Media ──

  @Get(':id/virtual-media')
  async getVirtualMedia(@Param('id') id: string, @Req() req: any) { return this.servers.getVirtualMedia(id, await this.tenantId(req)); }

  @Post(':id/virtual-media/mount')
  @Roles('OPERATOR')
  async mountVirtualMedia(@Param('id') id: string, @Body() body: { image: string }, @Req() req: any) {
    return this.servers.mountVirtualMedia(id, await this.tenantId(req), body.image);
  }

  @Post(':id/virtual-media/eject')
  @Roles('OPERATOR')
  async ejectVirtualMedia(@Param('id') id: string, @Req() req: any) { return this.servers.ejectVirtualMedia(id, await this.tenantId(req)); }

  // ── iDRAC Network ──

  @Get(':id/idrac-network')
  async getIdracNetwork(@Param('id') id: string, @Req() req: any) { return this.servers.getIdracNetwork(id, await this.tenantId(req)); }

  @Patch(':id/idrac-network')
  @Roles('ADMIN')
  async setIdracNetwork(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.servers.setIdracNetwork(id, await this.tenantId(req), body);
  }

  // ── Inventory ──

  @Get(':id/memory')
  async getMemory(@Param('id') id: string, @Req() req: any) { return this.servers.getMemory(id, await this.tenantId(req)); }

  @Get(':id/cpus')
  async getCpus(@Param('id') id: string, @Req() req: any) { return this.servers.getCpus(id, await this.tenantId(req)); }

  @Get(':id/pcie')
  async getPcieDevices(@Param('id') id: string, @Req() req: any) { return this.servers.getPcieDevices(id, await this.tenantId(req)); }

  // ── Lifecycle Controller ──

  @Get(':id/lc-jobs')
  async getLcJobs(@Param('id') id: string, @Req() req: any) { return this.servers.getLcJobs(id, await this.tenantId(req)); }

  @Delete(':id/lc-jobs/:jobId')
  @Roles('OPERATOR')
  async deleteLcJob(@Param('id') id: string, @Param('jobId') jobId: string, @Req() req: any) {
    return this.servers.deleteLcJob(id, await this.tenantId(req), jobId);
  }

  @Delete(':id/lc-jobs')
  @Roles('OPERATOR')
  async clearLcJobs(@Param('id') id: string, @Req() req: any) { return this.servers.clearLcJobs(id, await this.tenantId(req)); }

  // ── Certificates ──

  @Get(':id/certificates')
  async getCertificates(@Param('id') id: string, @Req() req: any) { return this.servers.getCertificates(id, await this.tenantId(req)); }

  // ── Licenses ──

  @Get(':id/licenses')
  async getLicenses(@Param('id') id: string, @Req() req: any) { return this.servers.getLicenses(id, await this.tenantId(req)); }

  // ── SCP ──

  @Post(':id/scp/export')
  @Roles('OPERATOR')
  async exportScp(@Param('id') id: string, @Body() body: { format: 'xml' | 'json' }, @Req() req: any) {
    return this.servers.exportScp(id, await this.tenantId(req), body.format);
  }

  // ── Console ──

  @Get(':id/console-url')
  async getConsoleUrl(@Param('id') id: string, @Req() req: any) { return this.servers.getConsoleUrl(id, await this.tenantId(req)); }
}
