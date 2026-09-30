import { BadRequestException, Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/decorators';

@Controller('dashboard')
@Roles('VIEWER')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('fleet-metrics')
  async fleetMetrics(@Req() req: { user?: { tenantId?: string } }) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required for fleet metrics.');
    }
    return this.dashboard.getFleetMetrics(tenantId);
  }
}
