/** agent.module.ts */
import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentBridgeService } from './agent-bridge.service';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, AgentBridgeService, PrismaService, RedisService],
  exports: [AgentService, AgentBridgeService],
})
export class AgentModule {}
