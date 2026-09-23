/** public-header.tsx — Single shared header for all pages (logged in or out). */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  User, LogOut, LayoutDashboard, Server, FileText, Settings, BookOpen, Menu, X, Mail, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const loggedInLinks = [
  { href: '/docs', label: 'Docs', Icon: BookOpen },
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/servers', label: 'Servers', Icon: Server },
  { href: '/audit', label: 'Audit Log', Icon: FileText },
  { href: '/settings', label: 'Settings', Icon: Settings },
  { href: '/admin', label: 'Admin', Icon: Shield, ownerOnly: true },
] as const;

function navActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/docs') return pathname === '/docs' || pathname.startsWith('/docs/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Record<string, string> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadUser = () => {
    try {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('storage', loadUser);
    return () => window.removeEventListener('storage', loadUser);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setMobileOpen(false); }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc); };
  }, []);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const isLoggedIn = !!user?.email;
  const isOwner = user?.role === 'OWNER';
  const displayName = user?.email?.split('@')[0] || user?.email || 'User';

  const linkClass = (href: string) => cn(
    'flex items-center gap-1.5 whitespace-nowrap text-sm transition-colors',
    navActive(pathname, href) ? 'text-white font-semibold' : 'text-white/80 hover:text-white',
  );

  return (
    <header className="bg-dell-blue text-white shrink-0 sticky top-0 z-50 shadow-md">
      <div className="max-w-layout mx-auto px-4 sm:px-6">
        <div className="h-[52px] flex items-center justify-between gap-4">
          <a href={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0">
            <img src="/logo.png" alt="iDRAC Console" className="h-7 brightness-0 invert" />
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <span className="text-sm font-semibold tracking-wide hidden lg:block">Universal iDRAC Console</span>
          </a>

          {/* Desktop Nav — same items for all logged-in pages */}
          <nav className="hidden xl:flex items-center gap-5 flex-1 justify-end min-w-0">
            {isLoggedIn ? (
              <>
                {loggedInLinks.map((link) => {
                  if ('ownerOnly' in link && link.ownerOnly && !isOwner) return null;
                  return (
                    <a key={link.href} href={link.href} className={linkClass(link.href)}>
                      <link.Icon className="w-3.5 h-3.5 shrink-0" /> {link.label}
                    </a>
                  );
                })}
                <div className="w-px h-5 bg-white/20 shrink-0" />
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 text-sm text-white/90 hover:text-white"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="max-w-[120px] truncate">{displayName}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-52 z-50">
                      <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card truncate">{user?.email}</div>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-secondary capitalize">{user?.role?.toLowerCase()}</div>
                      <button type="button" onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2 border-t border-border-card mt-1">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a href="/docs" className={linkClass('/docs')}><BookOpen className="w-3.5 h-3.5" /> Docs</a>
                <a href="/contact" className="text-white/80 hover:text-white flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Contact</a>
                <a href="/login" className="px-4 py-2 bg-white/20 rounded text-sm font-semibold hover:bg-white/30 transition-colors">Sign In</a>
                <a href="/register" className="px-4 py-2 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90 transition-colors">Get Started</a>
              </>
            )}
          </nav>

          {/* Tablet: compact nav */}
          <nav className="hidden md:flex xl:hidden items-center gap-3 flex-1 justify-end min-w-0 overflow-x-auto">
            {isLoggedIn ? (
              <>
                {loggedInLinks.map((link) => {
                  if ('ownerOnly' in link && link.ownerOnly && !isOwner) return null;
                  return (
                    <a key={link.href} href={link.href} className={cn(linkClass(link.href), 'text-xs')} title={link.label}>
                      <link.Icon className="w-4 h-4" />
                    </a>
                  );
                })}
                <div className="relative shrink-0" ref={menuRef}>
                  <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-1.5 text-xs">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><User className="w-4 h-4" /></div>
                    <span className="max-w-[80px] truncate">{displayName}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-52 z-50">
                      <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card truncate">{user?.email}</div>
                      <button type="button" onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a href="/docs" className={linkClass('/docs')}><BookOpen className="w-4 h-4" /></a>
                <a href="/login" className="px-3 py-1.5 bg-white/20 rounded text-xs font-semibold">Sign In</a>
              </>
            )}
          </nav>

          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 shrink-0" aria-label="Menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/20 px-4 py-3 space-y-1 text-sm max-w-layout mx-auto">
          {isLoggedIn ? (
            <>
              {loggedInLinks.map((link) => {
                if ('ownerOnly' in link && link.ownerOnly && !isOwner) return null;
                return (
                  <a key={link.href} href={link.href} className={cn('block py-2', navActive(pathname, link.href) ? 'text-white font-semibold' : 'text-white/80')}>
                    {link.label}
                  </a>
                );
              })}
              <div className="pt-2 border-t border-white/20 text-white/70 text-xs truncate">{user?.email}</div>
              <button type="button" onClick={logout} className="block py-2 text-white/80 hover:text-white w-full text-left">Sign Out</button>
            </>
          ) : (
            <>
              <a href="/docs" className="block py-2 text-white/80 hover:text-white">Docs</a>
              <a href="/contact" className="block py-2 text-white/80 hover:text-white">Contact</a>
              <a href="/login" className="block py-2 text-white/80 hover:text-white">Sign In</a>
              <a href="/register" className="block py-2 text-white font-semibold">Get Started</a>
            </>
          )}
        </div>
      )}
    </header>
  );
}
