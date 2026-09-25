/** tenant.module.ts */
import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../../common/mail.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, PrismaService, MailService],
  exports: [TenantService],
})
export class TenantModule {}
