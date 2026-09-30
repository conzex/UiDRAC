/** agent.module.ts */
import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentsController } from './agents.controller';
import { AgentService } from './agent.service';
import { AgentBridgeService } from './agent-bridge.service';
import { AgentConsoleStore } from './agent-console.store';
import { AgentHostIpService } from './agent-host-ip.service';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AgentController, AgentsController],
  providers: [AgentService, AgentBridgeService, AgentHostIpService, AgentConsoleStore, PrismaService, RedisService],
  exports: [AgentService, AgentBridgeService],
})
export class AgentModule {}
