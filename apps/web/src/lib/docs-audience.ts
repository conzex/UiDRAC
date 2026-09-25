/** Documentation visibility by product edition and signed-in role. */
import { CLOUD_SAAS_PRODUCT, OPEN_SOURCE_EDITION } from '@idrac/shared';
import { hasMinRole } from '@/lib/rbac';

export type DocsAudience = 'public' | 'admin-internal' | 'onprem-customer' | 'onprem-admin';

export type DocSectionLike = {
  id: string;
  audience?: DocsAudience;
};

export function filterDocSections<T extends DocSectionLike>(
  sections: T[],
  opts: { loggedIn: boolean; role?: string | null },
): T[] {
  const cloudSaas = CLOUD_SAAS_PRODUCT;
  const openSource = typeof OPEN_SOURCE_EDITION !== 'undefined' ? OPEN_SOURCE_EDITION : !cloudSaas;
  const isAdmin = opts.loggedIn && hasMinRole(opts.role, 'ADMIN');

  return sections.filter((s) => {
    const audience = s.audience ?? 'public';
    switch (audience) {
      case 'public':
        return true;
      case 'admin-internal':
        return cloudSaas && isAdmin;
      case 'onprem-customer':
        return openSource;
      case 'onprem-admin':
        return openSource && isAdmin;
      default:
        return false;
    }
  });
}

export function canViewDocSection(
  section: DocSectionLike,
  opts: { loggedIn: boolean; role?: string | null },
): boolean {
  return filterDocSections([section], opts).length > 0;
}
