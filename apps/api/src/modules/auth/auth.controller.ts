/** auth.controller.ts — Auth endpoints: login, register, refresh, logout. */
import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(body.email, body.password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; password: string; tenantName: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(body.email, body.password, body.tenantName);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: { userId: string }) {
    await this.auth.logout(body.userId);
    return { message: 'Logged out' };
  }
}
