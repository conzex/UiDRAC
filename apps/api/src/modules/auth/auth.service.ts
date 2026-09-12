/** auth.service.ts — Authentication business logic. */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, password: string, tenantName: string) {
    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const tenant = await this.prisma.tenant.create({ data: { name: tenantName, slug: slug + '-' + Date.now() } });
    const user = await this.prisma.user.create({
      data: { tenantId: tenant.id, email, passwordHash, role: 'OWNER' },
    });
    return this.generateTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    let valid = false;
    valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.generateTokens(user);
  }

  private async generateTokens(user: { id: string; email: string; tenantId: string; role: string }) {
    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: '7d',
    });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.session.create({
      data: {
        userId: user.id, refreshTokenHash, ip: '0.0.0.0', userAgent: 'api',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.REFRESH_SECRET ?? 'dev-refresh-secret',
      });
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const session = await this.prisma.session.findFirst({ where: { refreshTokenHash: hash } });
      if (!session) throw new UnauthorizedException('Invalid refresh token');

      await this.prisma.session.delete({ where: { id: session.id } });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
