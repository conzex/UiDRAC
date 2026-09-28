/** agents.controller.ts — Customer agent registry (organization-isolated). */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AgentService } from './agent.service';
import { Roles } from '../auth/decorators';
import { createHash } from 'crypto';
import { APP_VERSION } from '@idrac/shared';

@Controller('agents')
export class AgentsController {
  constructor(private agent: AgentService) {}

  @Get()
  @Roles('VIEWER')
  list(@Req() req: { user: { tenantId: string } }) {
    return this.agent.listAgents(req.user.tenantId);
  }

  @Get('download/meta')
  @Roles('VIEWER')
  downloadMeta() {
    return {
      latestVersion: APP_VERSION,
      productionCloudUrl: this.agent.getPublicConfig().cloudUrl,
      wsUrl: this.agent.getPublicConfig().wsUrl,
      platforms: [
        { id: 'win', label: 'Windows', architectures: ['x64'] },
        { id: 'linux', label: 'Linux', architectures: ['x64', 'arm64'] },
        { id: 'darwin', label: 'macOS', architectures: ['x64', 'arm64'] },
      ],
      requirements: {
        win: 'Windows 10/11 or Windows Server 2019+ (x64)',
        linux: 'Linux with systemd, Node.js 20+ (x64 or arm64)',
        darwin: 'macOS 12+ (Intel or Apple Silicon), Node.js 20+ for dev bundle',
      },
    };
  }

  @Post('register')
  @Roles('OPERATOR')
  async register(@Req() req: { user: { tenantId: string } }, @Body() body: { name?: string }) {
    const row = await this.agent.registerNewAgent(req.user.tenantId, body?.name);
    return this.agent.getAgent(req.user.tenantId, row.id);
  }

  @Get(':id')
  @Roles('VIEWER')
  get(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.agent.getAgent(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles('OPERATOR')
  rename(
    @Req() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Body() body: { name?: string },
  ) {
    return this.agent.renameAgent(req.user.tenantId, id, body?.name?.trim() || 'Site agent');
  }

  @Post(':id/disable')
  @Roles('ADMIN')
  disable(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.agent.disableAgent(req.user.tenantId, id);
  }

  @Post(':id/revoke')
  @Roles('ADMIN')
  revoke(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.agent.revokeAgent(req.user.tenantId, id);
  }

  @Post(':id/rotate')
  @Roles('ADMIN')
  async rotate(
    @Req() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Query('platform') platform: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    await this.agent.rotateCredentials(req.user.tenantId, id, plat);
    if (format === 'json') {
      const record = await this.agent.resolveAgentForDownload(req.user.tenantId, id);
      const { filename, bundle } = await this.agent.buildDownloadBundle(req.user.tenantId, plat, record);
      const json = JSON.stringify(bundle, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Checksum-Sha256', createHash('sha256').update(json).digest('hex'));
      res.send(json);
      return;
    }
    const { filename, stream, sha256 } = await this.agent.buildInstallerPackage(req.user.tenantId, plat, id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Checksum-Sha256', sha256);
    res.setHeader('Cache-Control', 'no-store, private');
    stream.pipe(res);
  }

  @Get(':id/download')
  @Roles('OPERATOR')
  async download(
    @Req() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Query('platform') platform: string,
    @Query('format') format: string,
    @Query('arch') _arch: string,
    @Res() res: Response,
  ) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    if (format === 'json') {
      const record = await this.agent.resolveAgentForDownload(req.user.tenantId, id);
      const { filename, bundle } = await this.agent.buildDownloadBundle(req.user.tenantId, plat, record);
      const json = JSON.stringify(bundle, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Checksum-Sha256', createHash('sha256').update(json).digest('hex'));
      res.send(json);
      return;
    }
    const { filename, stream, sha256 } = await this.agent.buildInstallerPackage(req.user.tenantId, plat, id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Checksum-Sha256', sha256);
    res.setHeader('Cache-Control', 'no-store, private');
    stream.pipe(res);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.agent.revokeAgent(req.user.tenantId, id);
  }
}
