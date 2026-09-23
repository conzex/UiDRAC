/** app-shell.tsx — Main application layout with Dell-styled navigation. */
'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User, LogOut, LayoutDashboard, Server, FileText, Settings } from 'lucide-react';
import { useSessionTimeout } from '@/lib/useSessionTimeout';
import SessionTimeoutModal from './session-timeout-modal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<Record<string, string>>({});
  const { showWarning, remainingSeconds, resetTimer } = useSessionTimeout();

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
      {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={resetTimer} />}
      {/* Top Banner */}
      <header className="h-[52px] bg-dell-blue flex items-center px-6 text-white shrink-0">
        <a href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
          <img src="/dell-logo.png" alt="Dell" className="h-5 brightness-0 invert" />
          <div className="w-px h-6 bg-white/30" />
          <span className="text-sm font-semibold tracking-wide">Universal iDRAC Console</span>
        </a>
        <div className="ml-auto flex items-center gap-4">
          <div className="relative">
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
          <a href="/dashboard" className="text-dell-blue font-semibold hover:text-dell-blue-hover flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </a>
          <a href="/servers" className="text-text-secondary hover:text-dell-blue flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> Servers
          </a>
          <a href="/audit" className="text-text-secondary hover:text-dell-blue flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Audit Log
          </a>
          <a href="/settings" className="text-text-secondary hover:text-dell-blue flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Settings
          </a>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-6">
        <div className="max-w-layout mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white border-t border-border-card flex items-center justify-center text-[11px] text-text-secondary shrink-0 gap-1">
        <span>Universal iDRAC Console v1.0.0</span>
        <span className="mx-1">·</span>
        <span>Built by</span>
        <a href="https://www.sumitkumawat.com" target="_blank" rel="noopener noreferrer" className="text-dell-blue hover:underline">Sumit Kumawat</a>
        <span className="mx-1">·</span>
        <a href="mailto:hello@sumitkumawat.com" className="text-dell-blue hover:underline">hello@sumitkumawat.com</a>
      </footer>
    </div>
  );
}
