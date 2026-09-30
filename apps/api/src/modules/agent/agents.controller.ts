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
import { AuditService } from '../audit/audit.service';
import { Roles } from '../auth/decorators';
import { createHash } from 'crypto';
import { APP_VERSION } from '@idrac/shared';

@Controller('agents')
export class AgentsController {
  constructor(private agent: AgentService, private audit: AuditService) {}

  private portalOrigin(req: { headers?: Record<string, string | string[] | undefined> }): string | undefined {
    const origin = req.headers?.origin;
    if (typeof origin === 'string' && origin.trim()) return origin.trim();
    const host = req.headers?.host;
    if (typeof host === 'string' && host.trim()) return `http://${host.trim()}`;
    return undefined;
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

  @Get()
  @Roles('VIEWER')
  list(@Req() req: { user: { tenantId: string } }) {
    return this.agent.listAgents(req.user.tenantId);
  }

  @Get('live')
  @Roles('VIEWER')
  async live(@Req() req: { user: { tenantId: string } }) {
    const agents = await this.agent.listAgents(req.user.tenantId);
    const status = await this.agent.getStatus(req.user.tenantId);
    return { at: new Date().toISOString(), status, agents };
  }

  @Get('download/meta')
  @Roles('VIEWER')
  downloadMeta() {
    const cfg = this.agent.getPublicConfig();
    return {
      latestVersion: APP_VERSION,
      productionCloudUrl: cfg.cloudUrl,
      wsUrl: cfg.wsUrl,
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
  async register(@Req() req: any, @Body() body: { name?: string }) {
    const row = await this.agent.registerNewAgent(req.user.tenantId, body?.name);
    const result = await this.agent.getAgent(req.user.tenantId, row.id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.register', { agentId: result.publicId, name: result.name }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Get(':id/console')
  @Roles('VIEWER')
  consoleView(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.agent.getAgentConsoleView(req.user.tenantId, id);
  }

  @Get(':id')
  @Roles('VIEWER')
  get(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.agent.getAgent(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles('OPERATOR')
  async rename(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string }) {
    const result = await this.agent.renameAgent(req.user.tenantId, id, body?.name?.trim() || 'Site agent');
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.rename', { agentId: id, name: body?.name }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post(':id/enable')
  @Roles('OPERATOR')
  async enable(@Req() req: any, @Param('id') id: string) {
    const result = await this.agent.enableAgent(req.user.tenantId, id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.enable', { agentId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post(':id/reactivate')
  @Roles('ADMIN')
  async reactivate(@Req() req: any, @Param('id') id: string) {
    const result = await this.agent.reactivateAgent(req.user.tenantId, id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.reactivate', { agentId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post(':id/disable')
  @Roles('ADMIN')
  async disable(@Req() req: any, @Param('id') id: string) {
    const result = await this.agent.disableAgent(req.user.tenantId, id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.disable', { agentId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post(':id/revoke')
  @Roles('ADMIN')
  async revoke(@Req() req: any, @Param('id') id: string) {
    const result = await this.agent.revokeAgent(req.user.tenantId, id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.revoke', { agentId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Post(':id/rotate')
  @Roles('ADMIN')
  async rotate(
    @Req() req: any,
    @Param('id') id: string,
    @Query('platform') platform: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    await this.agent.rotateCredentials(req.user.tenantId, id, plat);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.rotate_credentials', { agentId: id, platform: plat }, this.ip(req));
    } catch { /* non-critical */ }
    if (format === 'json') {
      const record = await this.agent.resolveAgentForDownload(req.user.tenantId, id);
      const { filename, bundle } = await this.agent.buildDownloadBundle(
        req.user.tenantId,
        plat,
        record,
        this.portalOrigin(req),
      );
      const json = JSON.stringify(bundle, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Checksum-Sha256', createHash('sha256').update(json).digest('hex'));
      res.send(json);
      return;
    }
    const { filename, stream, sha256 } = await this.agent.buildInstallerPackage(
      req.user.tenantId,
      plat,
      id,
      this.portalOrigin(req),
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Checksum-Sha256', sha256);
    res.setHeader('Cache-Control', 'no-store, private');
    stream.pipe(res);
  }

  @Get(':id/download')
  @Roles('OPERATOR')
  async download(
    @Req() req: any,
    @Param('id') id: string,
    @Query('platform') platform: string,
    @Query('format') format: string,
    @Query('arch') _arch: string,
    @Res() res: Response,
  ) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.download', { agentId: id, platform: plat }, this.ip(req));
    } catch { /* non-critical */ }
    if (format === 'json') {
      const record = await this.agent.resolveAgentForDownload(req.user.tenantId, id);
      const { filename, bundle } = await this.agent.buildDownloadBundle(
        req.user.tenantId,
        plat,
        record,
        this.portalOrigin(req),
      );
      const json = JSON.stringify(bundle, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Checksum-Sha256', createHash('sha256').update(json).digest('hex'));
      res.send(json);
      return;
    }
    const { filename, stream, sha256 } = await this.agent.buildInstallerPackage(
      req.user.tenantId,
      plat,
      id,
      this.portalOrigin(req),
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Checksum-Sha256', sha256);
    res.setHeader('Cache-Control', 'no-store, private');
    stream.pipe(res);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Req() req: any, @Param('id') id: string) {
    const result = await this.agent.deleteAgentRecord(req.user.tenantId, id);
    try {
      await this.audit.create(req.user.tenantId, req.user.id, 'agent.delete', { agentId: id, publicId: result.publicId }, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }
}
