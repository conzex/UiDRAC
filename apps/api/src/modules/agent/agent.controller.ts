/** agent.controller.ts — Tenant agent status and secure download bundles. */
import { Controller, Get, Post, Query, Req, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { AgentService } from './agent.service';
import { Public, Roles } from '../auth/decorators';

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
  status(@Req() req: any) {
    return this.agent.getStatus(req.user.tenantId);
  }

  @Get('download')
  @Roles('OPERATOR')
  async download(@Req() req: any, @Query('platform') platform: string, @Res() res: Response) {
    const plat = platform === 'win' || platform === 'darwin' ? platform : 'linux';
    const { filename, bundle } = await this.agent.buildDownloadBundle(req.user.tenantId, plat);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(bundle, null, 2));
  }

  @Post('rotate')
  @Roles('ADMIN')
  async rotate(@Req() req: any, @Res() res: Response) {
    const { filename, bundle } = await this.agent.rotateCredentials(req.user.tenantId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(bundle, null, 2));
  }

  @Public()
  @Get('install.sh')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  installScript() {
    return `#!/usr/bin/env bash
set -euo pipefail
CONFIG="idrac-agent.json"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ ! -f "$CONFIG" ]]; then
  echo "Missing $CONFIG — download it from your dashboard (Agent Download)." >&2
  exit 1
fi
export IDRAC_AGENT_CONFIG="$CONFIG"
if command -v node >/dev/null 2>&1; then
  npx --yes @idrac/edge-agent
else
  echo "Install Node.js 20+ then run: npx @idrac/edge-agent" >&2
  exit 1
fi
`;
  }
}
