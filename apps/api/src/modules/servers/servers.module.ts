/** servers.module.ts */
import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { ServersSummaryController } from './servers-summary.controller';
import { ServersConsoleController } from './servers-console.controller';
import { ServersConsoleTunnelController } from './servers-console-tunnel.controller';
import { ServerConsoleTunnelService } from './server-console-tunnel.service';
import { ServersService } from './servers.service';
import { ServerIdracCacheService } from './server-idrac-cache.service';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { AgentModule } from '../agent/agent.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AgentModule, AuditModule],
  controllers: [ServersSummaryController, ServersConsoleTunnelController, ServersConsoleController, ServersController],
  providers: [ServersService, ServerIdracCacheService, ServerConsoleTunnelService, PrismaService, RedisService],
  exports: [ServersService],
})
export class ServersModule {}
