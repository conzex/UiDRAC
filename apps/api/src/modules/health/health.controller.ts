/** health.controller.ts — Health check and API root handler. */
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_VERSION, PRODUCT_API_NAME } from '@idrac/shared';
import { Public } from '../auth/decorators';
import { publicAppUrl } from '../../common/edge-agent.config';

@Controller()
export class HealthController {
  @Public()
  @Get()
  root(@Req() req: Request, @Res() res: Response) {
    const portal = publicAppUrl();
    const accept = req.headers.accept ?? '';
    if (accept.includes('text/html')) {
      res.redirect(302, portal);
      return;
    }
    res.json({
      name: PRODUCT_API_NAME,
      version: APP_VERSION,
      status: 'running',
      timestamp: new Date().toISOString(),
      message: 'REST API is under /api. Open the portal URL in a browser.',
      portal,
      health: '/api/health',
      api: '/api',
    });
  }

  @Public()
  @Get('health')
  check() {
    return { status: 'ok', version: APP_VERSION, timestamp: new Date().toISOString() };
  }
}
