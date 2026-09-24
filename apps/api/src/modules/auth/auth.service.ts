/** auth.service.ts — Authentication business logic with session management. */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { AgentService } from '../agent/agent.service';

const SESSION_TTL_DAYS = 7;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private agentService: AgentService) {
    this.scheduleSessionCleanup();
  }

  async register(email: string, password: string, tenantName: string) {
    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const tenant = await this.prisma.tenant.create({ data: { name: tenantName, slug: slug + '-' + Date.now() } });
    const user = await this.prisma.user.create({
      data: { tenantId: tenant.id, email, passwordHash, role: 'OWNER' },
    });
    await this.agentService.ensureForTenant(tenant.id);
    return this.generateTokens(user, '0.0.0.0', 'api');
  }

  async login(email: string, password: string, ip = '0.0.0.0', userAgent = 'api') {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.generateTokens(user, ip, userAgent);
  }

  private async generateTokens(user: { id: string; email: string; tenantId: string; role: string }, ip: string, userAgent: string) {
    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: `${SESSION_TTL_DAYS}d`,
    });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.session.create({
      data: {
        userId: user.id, refreshTokenHash, ip, userAgent,
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    };
  }

  async refresh(refreshToken: string, ip = '0.0.0.0', userAgent = 'api') {
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
      return this.generateTokens(user, ip, userAgent);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async getActiveSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
  }

  private scheduleSessionCleanup() {
    setInterval(async () => {
      try {
        const { count } = await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
        if (count > 0) console.log(`Cleaned up ${count} expired sessions`);
      } catch { /* ignore cleanup errors */ }
    }, CLEANUP_INTERVAL);
  }
}
