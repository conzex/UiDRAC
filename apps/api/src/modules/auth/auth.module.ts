/** auth.module.ts — Authentication module. */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { AgentModule } from '../agent/agent.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), AgentModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService, JwtStrategy, PrismaService, RedisService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
