/** health.controller.ts — Health check and API root handler. */
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators';

@Controller()
export class HealthController {
  @Public()
  @Get()
  root() {
    return {
      name: 'Universal iDRAC Console API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      docs: '/api/health',
    };
  }

  @Public()
  @Get('health')
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
