/** Platform RBAC — mirrors API role hierarchy. */
export type PlatformRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

const ROLE_LEVEL: Record<PlatformRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

export function parsePlatformRole(value: string | undefined | null): PlatformRole | null {
  if (!value) return null;
  const upper = value.toUpperCase() as PlatformRole;
  return upper in ROLE_LEVEL ? upper : null;
}

export function roleLevel(role: PlatformRole | null | undefined): number {
  if (!role) return 0;
  return ROLE_LEVEL[role] ?? 0;
}

/** Minimum role required (hierarchical: OWNER satisfies ADMIN, etc.). */
export function hasMinRole(userRole: string | undefined | null, minimum: PlatformRole): boolean {
  const parsed = parsePlatformRole(userRole);
  return roleLevel(parsed) >= ROLE_LEVEL[minimum];
}

export function canReadApp(userRole: string | undefined | null): boolean {
  return hasMinRole(userRole, 'VIEWER');
}

export function canMutateServers(userRole: string | undefined | null): boolean {
  return hasMinRole(userRole, 'OPERATOR');
}

export function canDeleteServers(userRole: string | undefined | null): boolean {
  return hasMinRole(userRole, 'ADMIN');
}

export function canManageOrg(userRole: string | undefined | null): boolean {
  return hasMinRole(userRole, 'ADMIN');
}

export function canAccessAdminPanel(userRole: string | undefined | null): boolean {
  return hasMinRole(userRole, 'ADMIN');
}

export function canViewAudit(userRole: string | undefined | null): boolean {
  return hasMinRole(userRole, 'VIEWER');
}
