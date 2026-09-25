/** public-header.tsx — Marketing/public pages header (logged-out only). */
'use client';

import Link from 'next/link';
import { PRODUCT_NAME } from '@idrac/shared';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { PAGE_CONTAINER_CLASS } from './page-container';
import { useAuthUser } from '@/lib/auth-client';
import { PUBLIC_LOGGED_OUT_LINKS } from '@/lib/navigation';
import { headerCtaBtnClass, headerCtaGroupClass } from '@/lib/marketing-cta';

export default function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedIn, ready } = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (loggedIn && (pathname === '/login' || pathname === '/register')) {
      router.replace('/dashboard');
    }
  }, [ready, loggedIn, pathname, router]);

  if (!ready || loggedIn) return null;

  const onAuthPage = pathname === '/login' || pathname === '/register';
  const logoHref = onAuthPage ? '/' : '/';

  return (
    <header className="bg-dell-blue text-white shrink-0 sticky top-0 z-50 shadow-md">
      <div className={PAGE_CONTAINER_CLASS}>
        <div className="h-[52px] flex items-center justify-between gap-4 min-w-0">
          <Link href={logoHref} className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0 min-w-0">
            <img src="/logo.png" alt={PRODUCT_NAME} className="h-7 brightness-0 invert" />
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <span className="text-sm font-semibold tracking-wide hidden sm:block">{PRODUCT_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm shrink-0" aria-label="Primary">
            {PUBLIC_LOGGED_OUT_LINKS.map((link) => (
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
            <div className={headerCtaGroupClass}>
              <Link href="/login" className={`${headerCtaBtnClass} bg-white/20 hover:bg-white/30`}>
                Sign In
              </Link>
              <Link href="/register" className={`${headerCtaBtnClass} bg-white text-dell-blue hover:bg-white/90`}>
                Get Started
              </Link>
            </div>
          </nav>

          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`md:hidden border-t border-white/20 py-3 space-y-2 text-sm ${PAGE_CONTAINER_CLASS}`}>
          {PUBLIC_LOGGED_OUT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="block py-2 text-white/80 hover:text-white" onClick={() => setMobileOpen(false)}>
            Sign In
          </Link>
          <Link href="/register" className="block py-2 text-white font-semibold" onClick={() => setMobileOpen(false)}>
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}
