/** health.controller.ts — Health check and API root handler. */
import { Controller, Get } from '@nestjs/common';
import { APP_VERSION } from '@idrac/shared';
import { Public } from '../auth/decorators';

@Controller()
export class HealthController {
  @Public()
  @Get()
  root() {
    return {
      name: 'Universal iDRAC Console API',
      version: APP_VERSION,
      status: 'running',
      timestamp: new Date().toISOString(),
      docs: '/api/health',
    };
  }

  @Public()
  @Get('health')
  check() {
    return { status: 'ok', version: APP_VERSION, timestamp: new Date().toISOString() };
  }
}
