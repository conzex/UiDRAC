/** servers.module.ts */
import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';
import { PrismaService } from '../../prisma.service';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [AgentModule],
  controllers: [ServersController],
  providers: [ServersService, PrismaService],
  exports: [ServersService],
})
export class ServersModule {}
