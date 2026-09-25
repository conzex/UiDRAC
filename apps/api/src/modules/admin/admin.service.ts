/** Platform admin — manage tenants/users/servers/logs without exposing customer iDRAC secrets. */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { isPlatformSuperAdmin } from '../../common/platform-admin.util';
import { assertUserMayBeDeleted } from '../../common/protected-admin.util';
import { MailService } from '../../common/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private async assertSuperAdmin(actor: { sub: string; tenantId: string; role: string }) {
    if (!(await isPlatformSuperAdmin(this.prisma, { tenantId: actor.tenantId, role: actor.role }))) {
      throw new ForbiddenException('Platform administrator access required');
    }
  }

  async listUsers(actor: { sub: string; tenantId: string; role: string }) {
    await this.assertSuperAdmin(actor);
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        lastLoginAt: true,
        tenant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteUser(actor: { sub: string; tenantId: string; role: string }, userId: string) {
    await this.assertSuperAdmin(actor);
    if (userId === actor.sub) throw new ForbiddenException('You cannot delete your own account here');
    await assertUserMayBeDeleted(this.prisma, userId);
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  async resetUserPassword(actor: { sub: string; tenantId: string; role: string }, userId: string) {
    await this.assertSuperAdmin(actor);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    this.mail.assertDeliverableAccountEmail(user.email);
    const previousHash = user.passwordHash;
    const temporaryPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    try {
      await this.mail.sendPasswordResetToAccountEmail(user.email, temporaryPassword);
    } catch (err) {
      await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: previousHash } });
      throw err;
    }
    return {
      message: `Password reset instructions were sent to the email address on file for this account (${user.email}).`,
    };
  }

  async listTenants(actor: { sub: string; tenantId: string; role: string }) {
    await this.assertSuperAdmin(actor);
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        _count: { select: { users: true, servers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTenant(actor: { sub: string; tenantId: string; role: string }, id: string, data: { name?: string; plan?: string }) {
    await this.assertSuperAdmin(actor);
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async deleteTenant(actor: { sub: string; tenantId: string; role: string }, id: string) {
    await this.assertSuperAdmin(actor);
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Organization not found');
    if (tenant.slug === 'system') throw new ForbiddenException('Cannot delete the system organization');
    await this.prisma.tenant.delete({ where: { id } });
    return { deleted: true };
  }

  /** Inventory only — no hostnames, IPs, or credentials. */
  async listServerInventory(actor: { sub: string; tenantId: string; role: string }) {
    await this.assertSuperAdmin(actor);
    return this.prisma.server.findMany({
      select: {
        id: true,
        tenantId: true,
        generation: true,
        health: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteServer(actor: { sub: string; tenantId: string; role: string }, serverId: string) {
    await this.assertSuperAdmin(actor);
    await this.prisma.server.delete({ where: { id: serverId } });
    return { deleted: true };
  }

  async listAudit(actor: { sub: string; tenantId: string; role: string }) {
    await this.assertSuperAdmin(actor);
    const rows = await this.prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        createdAt: true,
        tenantId: true,
        user: { select: { email: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows;
  }

  async deleteAudit(actor: { sub: string; tenantId: string; role: string }, id: string) {
    await this.assertSuperAdmin(actor);
    await this.prisma.auditLog.delete({ where: { id } });
    return { deleted: true };
  }
}
