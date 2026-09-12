/** servers.controller.ts — Server management endpoints. */
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ServersService } from './servers.service';
import { Public } from '../auth/decorators';

@Controller('servers')
export class ServersController {
  constructor(private servers: ServersService) {}

  private tenantId(req: any): string { return req.user?.tenantId ?? ''; }

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.servers.findAll(this.tenantId(req), query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.servers.findOne(id, this.tenantId(req));
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.servers.create(this.tenantId(req), body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.servers.update(id, this.tenantId(req), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.servers.remove(id, this.tenantId(req));
  }

  @Public()
  @Post('probe')
  probe(@Body() body: { ip: string; username: string; password: string }) {
    return this.servers.probe(body.ip, body.username, body.password);
  }

  @Get(':id/health')
  getHealth(@Param('id') id: string, @Req() req: any) { return this.servers.getHealth(id, this.tenantId(req)); }

  @Get(':id/system')
  getSystem(@Param('id') id: string, @Req() req: any) { return this.servers.getSystemInfo(id, this.tenantId(req)); }

  @Get(':id/storage')
  getStorage(@Param('id') id: string, @Req() req: any) { return this.servers.getStorage(id, this.tenantId(req)); }

  @Get(':id/network')
  getNetwork(@Param('id') id: string, @Req() req: any) { return this.servers.getNetwork(id, this.tenantId(req)); }

  @Get(':id/firmware')
  getFirmware(@Param('id') id: string, @Req() req: any) { return this.servers.getFirmware(id, this.tenantId(req)); }

  @Get(':id/sensors')
  getSensors(@Param('id') id: string, @Req() req: any) { return this.servers.getSensors(id, this.tenantId(req)); }

  @Get(':id/sel')
  getSel(@Param('id') id: string, @Req() req: any) { return this.servers.getSel(id, this.tenantId(req)); }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Req() req: any) { return this.servers.getLogs(id, this.tenantId(req)); }

  @Post(':id/power')
  powerAction(@Param('id') id: string, @Body() body: { action: string }, @Req() req: any) {
    return this.servers.powerAction(id, this.tenantId(req), body.action);
  }
}
