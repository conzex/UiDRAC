/** servers.controller.ts — Server management endpoints. */
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ServersService } from './servers.service';
import { Public } from '../auth/decorators';
import { PrismaService } from '../../prisma.service';

const SYSTEM_SLUG = 'system';

@Controller('servers')
export class ServersController {
  constructor(private servers: ServersService, private prisma: PrismaService) {}

  private async tenantId(req: any): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user?.tenantId ?? '' } });
    if (tenant?.slug === SYSTEM_SLUG && req.user?.role === 'OWNER') return null;
    return req.user?.tenantId ?? '';
  }

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    return this.servers.findAll(await this.tenantId(req), query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.servers.findOne(id, await this.tenantId(req));
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.servers.create(req.user?.tenantId, body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.servers.update(id, await this.tenantId(req), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.servers.remove(id, await this.tenantId(req));
  }

  @Public()
  @Post('probe')
  probe(@Body() body: { ip: string; username: string; password: string }) {
    return this.servers.probe(body.ip, body.username, body.password);
  }

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

  @Post(':id/power')
  async powerAction(@Param('id') id: string, @Body() body: { action: string }, @Req() req: any) {
    return this.servers.powerAction(id, await this.tenantId(req), body.action);
  }
}
