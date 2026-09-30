/** Virtual console — launch / disconnect (separate controller for stable routing). */
import { Controller, Delete, Get, Param, Req } from '@nestjs/common';
import { ServersService } from './servers.service';
import { Roles } from '../auth/decorators';
import { PrismaService } from '../../prisma.service';
import { SYSTEM_TENANT_SLUG } from '../../common/rbac.constants';

@Controller('servers/:serverId/console')
@Roles('VIEWER')
export class ServersConsoleController {
  constructor(
    private servers: ServersService,
    private prisma: PrismaService,
  ) {}

  private async tenantId(req: { user?: { tenantId?: string; role?: string } }): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: req.user?.tenantId ?? '' } });
    if (tenant?.slug === SYSTEM_TENANT_SLUG && req.user?.role === 'OWNER') return null;
    return req.user?.tenantId ?? '';
  }

  @Get('launch')
  async launch(@Param('serverId') serverId: string, @Req() req: unknown) {
    return this.servers.launchConsole(serverId, await this.tenantId(req as { user?: { tenantId?: string; role?: string } }));
  }

  @Delete('session')
  async disconnect(@Param('serverId') serverId: string, @Req() req: unknown) {
    const user = req as { user?: { tenantId?: string } };
    return this.servers.disconnectConsole(serverId, await this.tenantId(user), user.user?.tenantId ?? '');
  }
}
