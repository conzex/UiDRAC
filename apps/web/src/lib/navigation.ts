/** Shared application navigation definitions. */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Server,
  FileText,
  Settings,
  Shield,
  BookOpen,
  Mail,
} from 'lucide-react';
import type { PlatformRole } from './rbac';
import { canAccessAdminPanel, canViewAudit, hasMinRole } from './rbac';
import type { StoredUser } from './auth-client';

export type AppNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  minRole: PlatformRole;
  /** Exact match only (e.g. dashboard). */
  exact?: boolean;
  /** Also active for these path prefixes (without trailing slash). */
  activePrefixes?: string[];
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, minRole: 'VIEWER', exact: true },
  {
    href: '/servers',
    label: 'Servers',
    Icon: Server,
    minRole: 'VIEWER',
    activePrefixes: ['/servers'],
  },
  { href: '/audit', label: 'Audit Log', Icon: FileText, minRole: 'VIEWER' },
  { href: '/settings', label: 'Settings', Icon: Settings, minRole: 'VIEWER' },
  { href: '/admin', label: 'Admin', Icon: Shield, minRole: 'OWNER', exact: true },
];

export type PublicNavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
  variant?: 'button' | 'link';
};

export const PUBLIC_LOGGED_OUT_LINKS: PublicNavLink[] = [
  { href: '/docs', label: 'Docs', Icon: BookOpen },
  { href: '/contact', label: 'Contact', Icon: Mail },
];

export function visibleAppNavItems(user: StoredUser | null): AppNavItem[] {
  const role = user?.role;
  return APP_NAV_ITEMS.filter((item) => {
    if (item.href === '/admin') return canAccessAdminPanel(role);
    if (item.href === '/audit') return canViewAudit(role);
    return hasMinRole(role, item.minRole);
  });
}

export function isAppNavActive(pathname: string | null, item: AppNavItem): boolean {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  if (item.activePrefixes?.length) {
    return item.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const PUBLIC_MARKETING_PATHS = ['/', '/login', '/register', '/contact'] as const;

export function isPublicMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (PUBLIC_MARKETING_PATHS as readonly string[]).includes(pathname);
}

export const PUBLIC_HEADER_OFFSET_PX = 52;

/** Sticky offset below fixed header(s). App shell = 52 + 40. */
export function headerStickyOffsetPx(underAppShell: boolean): number {
  return underAppShell ? 92 : PUBLIC_HEADER_OFFSET_PX;
}
