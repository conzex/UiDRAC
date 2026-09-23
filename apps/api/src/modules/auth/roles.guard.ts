/** roles.guard.ts — RBAC role checking guard. */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators';

const ROLE_HIERARCHY: Record<string, number> = { OWNER: 4, ADMIN: 3, OPERATOR: 2, VIEWER: 1 };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const ok = requiredRoles.some((role) => userLevel >= (ROLE_HIERARCHY[role] ?? 999));
    if (!ok) throw new ForbiddenException('Insufficient permissions for this action');
    return true;
  }
}
