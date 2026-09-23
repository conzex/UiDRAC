/** public-header.tsx — Shared header for all pages (logged in or out). */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, LayoutDashboard, Server, FileText, Settings, BookOpen, Menu, X } from 'lucide-react';

export default function PublicHeader() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, string> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
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

  const isLoggedIn = !!user?.email;

  return (
    <header className="bg-dell-blue text-white shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-[52px] flex items-center justify-between">
          <a href={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="iDRAC Console" className="h-7 brightness-0 invert" />
            <div className="w-px h-6 bg-white/30 hidden sm:block" />
            <span className="text-sm font-semibold tracking-wide hidden sm:block">Universal iDRAC Console</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="/docs" className="text-white/80 hover:text-white flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Docs</a>
            {isLoggedIn ? (
              <>
                <a href="/dashboard" className="text-white/80 hover:text-white flex items-center gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" /> Dashboard</a>
                <a href="/servers" className="text-white/80 hover:text-white flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> Servers</a>
                <a href="/audit" className="text-white/80 hover:text-white flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Audit Log</a>
                <a href="/settings" className="text-white/80 hover:text-white flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</a>
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-white/80 hover:text-white">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><User className="w-4 h-4" /></div>
                    <span className="hidden lg:block">{user?.email}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-48 z-50">
                      <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card capitalize">{user?.role?.toLowerCase()}</div>
                      <button onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Sign Out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a href="/contact" className="text-white/80 hover:text-white">Contact</a>
                <a href="/login" className="px-4 py-1.5 bg-white/20 rounded text-sm font-medium hover:bg-white/30">Sign In</a>
                <a href="/register" className="px-4 py-1.5 bg-white text-dell-blue rounded text-sm font-semibold hover:bg-white/90">Get Started</a>
              </>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/20 px-4 py-3 space-y-2 text-sm">
          <a href="/docs" className="block py-2 text-white/80 hover:text-white">Docs</a>
          {isLoggedIn ? (
            <>
              <a href="/dashboard" className="block py-2 text-white/80 hover:text-white">Dashboard</a>
              <a href="/servers" className="block py-2 text-white/80 hover:text-white">Servers</a>
              <a href="/audit" className="block py-2 text-white/80 hover:text-white">Audit Log</a>
              <a href="/settings" className="block py-2 text-white/80 hover:text-white">Settings</a>
              <button onClick={logout} className="block py-2 text-white/80 hover:text-white">Sign Out</button>
            </>
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
