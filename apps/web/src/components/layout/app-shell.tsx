/** app-shell.tsx — Main application layout with Dell-styled navigation. */
'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<Record<string, string>>({});

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user') || '{}')); } catch { /* ignore */ }
  }, []);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Banner */}
      <header className="h-[52px] bg-dell-blue flex items-center px-6 text-white shrink-0">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 60 20" className="w-[48px] h-[16px] fill-white">
            <text x="0" y="16" fontFamily="Arial Black" fontSize="18" fontWeight="900">DELL</text>
          </svg>
          <div className="w-px h-6 bg-white/30" />
          <span className="text-sm font-semibold tracking-wide">Universal iDRAC Console</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-sm hover:text-white/80">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:block">{user?.email || 'User'}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white text-text-primary rounded shadow-lg py-1 w-48 z-50">
                <div className="px-3 py-2 text-xs text-text-secondary border-b border-border-card">{user?.role || 'user'}</div>
                <button onClick={logout} className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Secondary Nav */}
      <nav className="h-[40px] bg-white border-b border-border-card flex items-center px-6 shrink-0">
        <div className="flex gap-6 text-sm">
          <a href="/dashboard" className="text-dell-blue font-semibold hover:text-dell-blue-hover">Dashboard</a>
          <a href="/servers" className="text-text-secondary hover:text-dell-blue">Servers</a>
          <a href="/audit" className="text-text-secondary hover:text-dell-blue">Audit Log</a>
          <a href="/settings" className="text-text-secondary hover:text-dell-blue">Settings</a>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-6">
        <div className="max-w-layout mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="h-8 bg-white border-t border-border-card flex items-center justify-center text-[11px] text-text-secondary shrink-0">
        © Universal iDRAC Console v1.0.0 · Server time: {new Date().toLocaleString()}
      </footer>
    </div>
  );
}
