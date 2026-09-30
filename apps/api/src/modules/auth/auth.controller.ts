/** auth.controller.ts — Auth endpoints: login, register, refresh, logout, sessions. */
import { Controller, Post, Get, Delete, Body, Param, Req, Res, HttpCode, Patch } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private audit: AuditService) {}

  private ip(req: Request | any): string {
    return (
      (req.headers?.['cf-connecting-ip'] as string)?.trim() ||
      (req.headers?.['true-client-ip'] as string)?.trim() ||
      (req.headers?.['x-real-ip'] as string)?.trim() ||
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip || '0.0.0.0'
    );
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = this.ip(req);
    const ua = req.headers['user-agent'] || 'unknown';
    const result = await this.auth.login(body.email, body.password, ip, ua);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    try {
      await this.audit.create(result.user.tenantId, result.user.id, 'auth.login', { email: body.email }, ip);
    } catch { /* audit failure must not block login */ }
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; password: string; tenantName: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = this.ip(req);
    const ua = req.headers['user-agent'] || 'unknown';
    const result = await this.auth.register(body.email, body.password, body.tenantName);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    try {
      await this.audit.create(result.user.tenantId, result.user.id, 'auth.register', { email: body.email, tenantName: body.tenantName }, ip);
    } catch { /* audit failure must not block registration */ }
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    const ip = this.ip(req);
    const ua = req.headers['user-agent'] || 'unknown';
    const result = await this.auth.refresh(body.refreshToken, ip, ua);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: any) {
    await this.auth.logout(req.user?.id);
    try {
      await this.audit.create(req.user?.tenantId, req.user?.id, 'auth.logout', {}, this.ip(req));
    } catch { /* non-critical */ }
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@Req() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  @Patch('password')
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    const result = await this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
    try {
      await this.audit.create(req.user?.tenantId, req.user?.id, 'auth.password_change', {}, this.ip(req));
    } catch { /* non-critical */ }
    return result;
  }

  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.auth.getActiveSessions(req.user?.id);
  }

  @Delete('sessions/:id')
  async revokeSession(@Param('id') id: string, @Req() req: any) {
    await this.auth.revokeSession(req.user?.id, id);
    try {
      await this.audit.create(req.user?.tenantId, req.user?.id, 'auth.session_revoke', { sessionId: id }, this.ip(req));
    } catch { /* non-critical */ }
    return { message: 'Session revoked' };
  }
}
