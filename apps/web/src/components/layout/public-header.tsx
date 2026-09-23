/** public-header.tsx — Marketing/public pages header (logged in or out). */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BookOpen, Mail, Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuthUser } from '@/lib/auth-client';
import {
  isAppNavActive,
  isPublicMarketingPath,
  PUBLIC_LOGGED_OUT_LINKS,
  visibleAppNavItems,
} from '@/lib/navigation';
import UserMenu from './user-menu';

export default function PublicHeader() {
  const pathname = usePathname();
  const { user, loggedInOrToken, ready } = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const marketing = isPublicMarketingPath(pathname);
  const containerClass = pathname === '/' ? 'max-w-7xl' : 'max-w-layout';
  const appItems = visibleAppNavItems(user);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  if (!ready) return null;

  const logoHref = loggedInOrToken ? '/dashboard' : '/';

  return (
    <header className="bg-dell-blue text-white shrink-0 sticky top-0 z-50 shadow-md">
      <div className={`${containerClass} mx-auto px-4 sm:px-6`}>
        <div className="h-[52px] flex items-center justify-between gap-4 min-w-0">
          <Link href={logoHref} className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0 min-w-0">
            <img src="/logo.png" alt="iDRAC Console" className="h-7 brightness-0 invert" />
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <span className="text-sm font-semibold tracking-wide hidden sm:block">Universal iDRAC Console</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm shrink-0" aria-label="Primary">
            {!loggedInOrToken &&
              PUBLIC_LOGGED_OUT_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap ${
                    pathname === link.href ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <link.Icon className="w-3.5 h-3.5" /> {link.label}
                </Link>
              ))}

            {loggedInOrToken && marketing && (
              <>
                <Link href="/docs" className="text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                  <BookOpen className="w-3.5 h-3.5" /> Docs
                </Link>
                <Link href="/contact" className="text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                  <Mail className="w-3.5 h-3.5" /> Contact
                </Link>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </Link>
                <UserMenu email={user?.email} role={user?.role} />
              </>
            )}

            {loggedInOrToken && !marketing && (
              <>
                <Link
                  href="/docs"
                  className={`flex items-center gap-1.5 whitespace-nowrap ${
                    pathname?.startsWith('/docs') ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Docs
                </Link>
                {appItems.map((item) => {
                  const active = isAppNavActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 whitespace-nowrap ${
                        active ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <item.Icon className="w-3.5 h-3.5" /> {item.label}
                    </Link>
                  );
                })}
                <UserMenu email={user?.email} role={user?.role} />
              </>
            )}

            {!loggedInOrToken && (
              <>
                <Link href="/login" className="px-4 py-2 bg-white/20 rounded text-sm font-semibold hover:bg-white/30 transition-colors whitespace-nowrap">
                  Sign In
                </Link>
                <Link href="/register" className="px-4 py-2 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap">
                  Get Started
                </Link>
              </>
            )}
          </nav>

          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`md:hidden border-t border-white/20 px-4 py-3 space-y-2 text-sm ${containerClass} mx-auto`}>
          {!loggedInOrToken && (
            <>
              {PUBLIC_LOGGED_OUT_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href="/login" className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/register" className="block py-2 text-white font-semibold" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </>
          )}
          {loggedInOrToken && marketing && (
            <>
              <Link href="/docs" className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>Docs</Link>
              <Link href="/contact" className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>Contact</Link>
              <Link href="/dashboard" className="block py-2 text-white font-semibold" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            </>
          )}
          {loggedInOrToken && !marketing && (
            <>
              <Link href="/docs" className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>Docs</Link>
              {appItems.map((item) => (
                <Link key={item.href} href={item.href} className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </header>
  );
}
