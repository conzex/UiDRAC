/** public-header.tsx — Blue top bar + white app nav (logged in) or public links (logged out). */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  User, LogOut, LayoutDashboard, Server, FileText, Settings, BookOpen, Menu, X, Mail, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const appNavLinks = [
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
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
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
    setMenuOpen(false);
    setMobileOpen(false);
    router.push('/login');
  };

  const isLoggedIn = mounted && !!user?.email;
  const isOwner = user?.role === 'OWNER';
  const displayName = user?.email?.split('@')[0] || user?.email || 'User';

  const visibleAppLinks = appNavLinks.filter(
    (link) => !('ownerOnly' in link && link.ownerOnly) || isOwner,
  );

  return (
    <header className="shrink-0 sticky top-0 z-50 shadow-md">
      {/* Top bar */}
      <div className="bg-dell-blue text-white">
        <div className="max-w-layout mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between gap-4">
          <a
            href={isLoggedIn ? '/dashboard' : '/'}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0 min-w-0"
          >
            <img src="/logo.png" alt="iDRAC Console" className="h-7 brightness-0 invert shrink-0" />
            <div className="w-px h-6 bg-white/30 hidden sm:block shrink-0" />
            <span className="text-sm font-semibold tracking-wide hidden sm:block truncate">
              Universal iDRAC Console
            </span>
          </a>

          {/* Logged out — public actions (desktop) */}
          {!isLoggedIn && mounted && (
            <nav className="hidden md:flex items-center gap-5 text-sm ml-auto">
              <a href="/docs" className="text-white/80 hover:text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Docs
              </a>
              <a href="/contact" className="text-white/80 hover:text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Contact
              </a>
              <a href="/login" className="px-4 py-2 bg-white/20 rounded text-sm font-semibold hover:bg-white/30 transition-colors">
                Sign In
              </a>
              <a href="/register" className="px-4 py-2 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90 transition-colors">
                Get Started
              </a>
            </nav>
          )}

          {/* Logged in — user menu (desktop) */}
          {isLoggedIn && (
            <div className="relative ml-auto shrink-0 hidden md:block" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 text-sm text-white hover:text-white/90"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-medium max-w-[140px] truncate">{displayName}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 bg-white text-text-primary rounded shadow-lg py-1 w-52 z-50">
                  <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card truncate">
                    {user?.email}
                  </div>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-secondary capitalize">
                    {user?.role?.toLowerCase()}
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2 border-t border-border-card mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 shrink-0 ml-auto"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* App navigation — logged in only (desktop) */}
      {isLoggedIn && (
        <nav className="hidden md:block h-[40px] bg-white border-b border-border-card">
          <div className="max-w-layout mx-auto px-4 sm:px-6 h-full flex items-center gap-6 text-sm overflow-x-auto">
            {visibleAppLinks.map((link) => {
              const active = navActive(pathname, link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap shrink-0 border-b-2 h-[40px] -mb-px transition-colors',
                    active
                      ? 'border-dell-blue text-dell-blue font-semibold'
                      : 'border-transparent text-text-secondary hover:text-dell-blue',
                  )}
                >
                  <link.Icon className="w-3.5 h-3.5" />
                  {link.label}
                </a>
              );
            })}
          </div>
        </nav>
      )}

      {/* Mobile drawer */}
      {mobileOpen && mounted && (
        <div className="md:hidden bg-dell-blue border-t border-white/20 text-white">
          <div className="max-w-layout mx-auto px-4 py-3 space-y-1 text-sm">
            {isLoggedIn ? (
              <>
                {visibleAppLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2 py-2.5',
                      navActive(pathname, link.href) ? 'font-semibold' : 'text-white/85',
                    )}
                  >
                    <link.Icon className="w-4 h-4" /> {link.label}
                  </a>
                ))}
                <div className="pt-3 mt-2 border-t border-white/20 flex items-center justify-between">
                  <span className="text-white/80 truncate text-xs">{user?.email}</span>
                  <button type="button" onClick={logout} className="text-sm font-medium hover:underline">
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <a href="/docs" className="block py-2.5 text-white/85" onClick={() => setMobileOpen(false)}>Docs</a>
                <a href="/contact" className="block py-2.5 text-white/85" onClick={() => setMobileOpen(false)}>Contact</a>
                <a href="/login" className="block py-2.5" onClick={() => setMobileOpen(false)}>Sign In</a>
                <a href="/register" className="block py-2.5 font-semibold" onClick={() => setMobileOpen(false)}>Get Started</a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
