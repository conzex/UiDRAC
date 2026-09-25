/**
 * app.module.ts — Root NestJS module.
 */
import { Module, OnModuleInit } from '@nestjs/common';
import { bootstrapPlatformAdmin } from './bootstrap/platform-admin.bootstrap';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { AuthModule } from './modules/auth/auth.module';
import { ServersModule } from './modules/servers/servers.module';
import { AuditModule } from './modules/audit/audit.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AgentModule } from './modules/agent/agent.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './modules/health/health.controller';
import { MailService } from './common/mail.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '15m' },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    ServersModule,
    AuditModule,
    TenantModule,
    AgentModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService, RedisService, MailService],
  exports: [PrismaService, RedisService, MailService],
})
export class AppModule implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await bootstrapPlatformAdmin(this.prisma);
  }
}
