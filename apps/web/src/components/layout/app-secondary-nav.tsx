'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { visibleAppNavItems } from '@/lib/navigation';
import { isAppNavActive } from '@/lib/navigation';
import type { StoredUser } from '@/lib/auth-client';
import PageContainer from './page-container';

type AppSecondaryNavProps = {
  user: StoredUser | null;
};

export default function AppSecondaryNav({ user }: AppSecondaryNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = visibleAppNavItems(user);

  const linkClass = (active: boolean) =>
    `flex items-center gap-1.5 whitespace-nowrap px-1 py-2 ${
      active ? 'text-dell-blue font-semibold' : 'text-text-secondary hover:text-dell-blue'
    }`;

  return (
    <nav className="bg-white border-b border-border-card shrink-0 z-40" aria-label="Application">
      <PageContainer className="hidden md:flex h-[40px] items-center overflow-x-auto">
        <div className="flex gap-4 text-sm min-w-0">
          {items.map((item) => {
            const active = isAppNavActive(pathname, item);
            return (
              <Link key={item.href} href={item.href} className={linkClass(active)}>
                <item.Icon className="w-3.5 h-3.5" /> {item.label}
              </Link>
            );
          })}
        </div>
      </PageContainer>

      <div className="md:hidden border-b border-border-card">
        <PageContainer>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-full h-10 flex items-center justify-between text-sm text-text-secondary"
            aria-expanded={mobileOpen}
          >
            <span className="font-medium text-text-primary">Application menu</span>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          {mobileOpen && (
            <div className="pb-3 space-y-1 text-sm">
              {items.map((item) => {
                const active = isAppNavActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block py-2 ${active ? 'text-dell-blue font-semibold' : 'text-text-secondary'}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </PageContainer>
      </div>
    </nav>
  );
}
