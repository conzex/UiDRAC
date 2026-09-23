/** app-shell.tsx — Authenticated layout wrapping the shared public header/footer. */
'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { User, LogOut, LayoutDashboard, Server, FileText, Settings, BookOpen } from 'lucide-react';
import { useSessionTimeout } from '@/lib/useSessionTimeout';
import SessionTimeoutModal from './session-timeout-modal';
import PublicFooter from './public-footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<Record<string, string>>({});
  const { showWarning, remainingSeconds, resetTimer } = useSessionTimeout();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user') || '{}')); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc); };
  }, []);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/servers', label: 'Servers', Icon: Server },
    { href: '/audit', label: 'Audit Log', Icon: FileText },
    { href: '/settings', label: 'Settings', Icon: Settings },
    { href: '/docs', label: 'Docs', Icon: BookOpen },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-body">
      {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={resetTimer} />}

      {/* Top Banner */}
      <header className="h-[52px] bg-dell-blue flex items-center px-6 text-white shrink-0 sticky top-0 z-50 shadow-md">
        <a href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
          <img src="/logo.png" alt="iDRAC Console" className="h-6 brightness-0 invert" />
          <div className="w-px h-6 bg-white/30" />
          <span className="text-sm font-semibold tracking-wide">Universal iDRAC Console</span>
        </a>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-sm hover:text-white/80">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:block">{user?.email || 'User'}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-48 z-50">
                <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card capitalize">{user?.role?.toLowerCase() || 'user'}</div>
                <button onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Secondary Nav */}
      <nav className="h-[40px] bg-white border-b border-border-card flex items-center px-6 shrink-0">
        <div className="flex gap-6 text-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <a key={link.href} href={link.href} className={`flex items-center gap-1.5 ${isActive ? 'text-dell-blue font-semibold' : 'text-text-secondary hover:text-dell-blue'}`}>
                <link.Icon className="w-3.5 h-3.5" /> {link.label}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-6">
        <div className="max-w-layout mx-auto">{children}</div>
      </main>

      <PublicFooter />
    </div>
  );
}
