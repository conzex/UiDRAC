/** public-header.tsx — Shared header for public pages (logged in or out). */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, LayoutDashboard, Server, FileText, Settings, BookOpen, Menu, X, Mail, Shield } from 'lucide-react';

export default function PublicHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Record<string, string> | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
      else setUser(null);
      setHasToken(!!localStorage.getItem('accessToken'));
    } catch {
      setUser(null);
      setHasToken(false);
    }
  }, [pathname]);

  useEffect(() => {
    const syncAuth = () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
        else setUser(null);
        setHasToken(!!localStorage.getItem('accessToken'));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', syncAuth);
    window.addEventListener('idrac-auth-change', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('idrac-auth-change', syncAuth);
    };
  }, []);

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

  const isLoggedIn = !!user?.email || hasToken;
  const isOwner = user?.role === 'OWNER';
  const isHome = pathname === '/';
  const containerClass = isHome ? 'max-w-7xl' : 'max-w-layout';

  const appNavLinks = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/servers', label: 'Servers', Icon: Server },
    { href: '/audit', label: 'Audit Log', Icon: FileText },
    { href: '/settings', label: 'Settings', Icon: Settings },
    ...(isOwner ? [{ href: '/admin', label: 'Admin', Icon: Shield }] : []),
  ] as const;

  const userMenu = (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-white/80 hover:text-white">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><User className="w-4 h-4" /></div>
        <span className="hidden lg:block truncate max-w-[180px]">{user?.email || 'Account'}</span>
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-48 z-50">
          {user?.role && (
            <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card capitalize">{user.role.toLowerCase()}</div>
          )}
          <button type="button" onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Sign Out</button>
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-dell-blue text-white shrink-0 sticky top-0 z-50 shadow-md">
      <div className={`${containerClass} mx-auto px-4 sm:px-6`}>
        <div className="h-[52px] flex items-center justify-between">
          <a href={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="iDRAC Console" className="h-7 brightness-0 invert" />
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <span className="text-sm font-semibold tracking-wide hidden sm:block">Universal iDRAC Console</span>
          </a>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm shrink-0">
            <a href="/docs" className="text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap"><BookOpen className="w-3.5 h-3.5" /> Docs</a>
            {isLoggedIn ? (
              isHome ? (
                <>
                  <a href="/contact" className="text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap"><Mail className="w-3.5 h-3.5" /> Contact</a>
                  <a href="/dashboard" className="px-4 py-2 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap inline-flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                  </a>
                  {userMenu}
                </>
              ) : (
                <>
                  {appNavLinks.map((link) => (
                    <a key={link.href} href={link.href} className="text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                      <link.Icon className="w-3.5 h-3.5" /> {link.label}
                    </a>
                  ))}
                  {userMenu}
                </>
              )
            ) : (
              <>
                <a href="/contact" className="text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap"><Mail className="w-3.5 h-3.5" /> Contact</a>
                <a href="/login" className="px-4 py-2 bg-white/20 rounded text-sm font-semibold hover:bg-white/30 transition-colors whitespace-nowrap">Sign In</a>
                <a href="/register" className="px-4 py-2 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap">Get Started</a>
              </>
            )}
          </nav>

          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`md:hidden border-t border-white/20 px-4 py-3 space-y-2 text-sm ${containerClass} mx-auto`}>
          <a href="/docs" className="block py-2 text-white/80 hover:text-white">Docs</a>
          {isLoggedIn ? (
            isHome ? (
              <>
                <a href="/contact" className="block py-2 text-white/80 hover:text-white">Contact</a>
                <a href="/dashboard" className="block py-2 text-white font-semibold">Dashboard</a>
                <button type="button" onClick={logout} className="block py-2 text-white/80 hover:text-white">Sign Out</button>
              </>
            ) : (
              <>
                {appNavLinks.map((link) => (
                  <a key={link.href} href={link.href} className="block py-2 text-white/80 hover:text-white">{link.label}</a>
                ))}
                <button type="button" onClick={logout} className="block py-2 text-white/80 hover:text-white">Sign Out</button>
              </>
            )
          ) : (
            <>
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
