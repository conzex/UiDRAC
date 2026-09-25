/** auth.controller.ts — Auth endpoints: login, register, refresh, logout, sessions. */
import { Controller, Post, Get, Delete, Body, Param, Req, Res, HttpCode, Patch } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'unknown';
    const result = await this.auth.login(body.email, body.password, ip, ua);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; password: string; tenantName: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'unknown';
    const result = await this.auth.register(body.email, body.password, body.tenantName);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
    const ua = req.headers['user-agent'] || 'unknown';
    const result = await this.auth.refresh(body.refreshToken, ip, ua);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn, user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: any) {
    await this.auth.logout(req.user?.id);
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@Req() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  @Patch('password')
  changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Get('sessions')
  async getSessions(@Req() req: any) {
    return this.auth.getActiveSessions(req.user?.id);
  }

  @Delete('sessions/:id')
  async revokeSession(@Param('id') id: string, @Req() req: any) {
    await this.auth.revokeSession(req.user?.id, id);
    return { message: 'Session revoked' };
  }
}
