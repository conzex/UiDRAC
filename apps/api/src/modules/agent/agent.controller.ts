/** agent.controller.ts — Legacy /api/agent routes (download, status, rotate). */
import { Controller, Get, Post, Query, Req, Res, Header, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AgentService } from './agent.service';
import { Public, Roles } from '../auth/decorators';
import { readAgentWindowsFile, resolveAgentMsiPath, resolveAgentSetupExePath } from './agent-windows.paths';
import { resolveAgentMacosPkgPath } from './agent-macos.paths';
import { createReadStream } from 'fs';

function pipeInstaller(
  res: Response,
  tenantId: string,
  filename: string,
  stream: NodeJS.ReadableStream,
  sha256: string,
) {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-UiDRAC-Tenant-Id', tenantId);
  res.setHeader('X-Checksum-Sha256', sha256);
  stream.pipe(res);
}

@Controller('agent')
export class AgentController {
  constructor(private agent: AgentService) {}

  @Public()
  @Get('config')
  publicConfig() {
    return this.agent.getPublicConfig();
  }

  @Get('status')
  @Roles('VIEWER')
  status(@Req() req: { user: { tenantId: string } }) {
    return this.agent.getStatus(req.user.tenantId);
  }

  @Get('download')
  @Roles('OPERATOR')
  async download(
    @Req() req: { user: { tenantId: string } },
    @Query('platform') platform: string,
    @Query('format') format: string,
    @Query('agentId') agentId: string | undefined,
    @Res() res: Response,
  ) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    if (format === 'json') {
      const record = await this.agent.resolveAgentForDownload(req.user.tenantId, agentId);
      const { filename, bundle } = await this.agent.buildDownloadBundle(req.user.tenantId, plat, record);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('X-UiDRAC-Tenant-Id', req.user.tenantId);
      res.send(JSON.stringify(bundle, null, 2));
      return;
    }
    const { filename, stream, sha256 } = await this.agent.buildInstallerPackage(
      req.user.tenantId,
      plat,
      agentId,
    );
    pipeInstaller(res, req.user.tenantId, filename, stream, sha256);
  }

  @Get('console')
  @Roles('VIEWER')
  consoleView(@Req() req: { user: { tenantId: string } }) {
    return this.agent.getConsoleView(req.user.tenantId);
  }

  @Post('rotate')
  @Roles('ADMIN')
  async rotate(
    @Req() req: { user: { tenantId: string } },
    @Query('platform') platform: string,
    @Query('format') format: string,
    @Query('agentId') agentId: string | undefined,
    @Res() res: Response,
  ) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    const primary = await this.agent.resolveAgentForDownload(req.user.tenantId, agentId);
    await this.agent.rotateCredentials(req.user.tenantId, primary.id, plat);
    if (format === 'json') {
      const { filename, bundle } = await this.agent.buildDownloadBundle(req.user.tenantId, plat, primary);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(bundle, null, 2));
      return;
    }
    const { filename, stream, sha256 } = await this.agent.buildInstallerPackage(
      req.user.tenantId,
      plat,
      primary.id,
    );
    pipeInstaller(res, req.user.tenantId, filename, stream, sha256);
  }

  @Public()
  @Get('install.ps1')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  installPs1() {
    return readAgentWindowsFile('install.ps1');
  }

  @Public()
  @Get('install.sh')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  installScript() {
    return `#!/usr/bin/env bash
set -euo pipefail
CONFIG="credentials.json"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ ! -f "$CONFIG" ]]; then
  echo "Download an agent package from https://uidrac.cloud.conzex.com/agents" >&2
  exit 1
fi
export UIDRAC_AGENT_CONFIG="$(cd "$(dirname "$CONFIG")" && pwd)/$(basename "$CONFIG")"
DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$DIR/agent-bundle.cjs" ]]; then
  exec node "$DIR/agent-bundle.cjs"
fi
if command -v node >/dev/null 2>&1; then
  npx --yes @idrac/edge-agent
else
  echo "Install Node.js 20+ or use the full ZIP from Agents → Download Agent." >&2
  exit 1
fi
`;
  }

  @Public()
  @Get('download/msi')
  downloadMsi(@Res() res: Response) {
    const msi = resolveAgentMsiPath();
    if (!msi) {
      throw new NotFoundException(
        'Windows MSI not published. Build with scripts/build-edge-agent-installer.ps1 on Windows.',
      );
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="uidrac-agent-setup.msi"');
    createReadStream(msi).pipe(res);
  }

  @Public()
  @Get('download/setup')
  downloadSetup(@Res() res: Response) {
    const exe = resolveAgentSetupExePath();
    if (!exe) {
      throw new NotFoundException(
        'Windows setup.exe not published. Build with scripts/build-edge-agent-installer.ps1 on Windows.',
      );
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="UidracAgentSetup.exe"');
    createReadStream(exe).pipe(res);
  }

  @Public()
  @Get('download/macos')
  downloadMacosPkg(@Res() res: Response) {
    const pkg = resolveAgentMacosPkgPath();
    if (!pkg) {
      throw new NotFoundException(
        'macOS PKG not published. Build with scripts/build-edge-agent-macos.sh on a Mac.',
      );
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="UidracAgent.pkg"');
    createReadStream(pkg).pipe(res);
  }
}
