/** app-shell.tsx — Authenticated layout using shared PublicHeader/Footer. */
'use client';
import PublicHeader from './public-header';
import PublicFooter from './public-footer';
import { useSessionTimeout } from '@/lib/useSessionTimeout';
import SessionTimeoutModal from './session-timeout-modal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { showWarning, remainingSeconds, resetTimer } = useSessionTimeout();

  return (
    <div className="min-h-screen flex flex-col bg-bg-body">
      {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={resetTimer} />}
      <PublicHeader />
      <main className="flex-1 p-6">
        <div className="max-w-layout mx-auto">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
