/** app-shell.tsx — Authenticated layout: blue header + white secondary nav. */
'use client';

import { usePathname } from 'next/navigation';
import { useSessionTimeout } from '@/lib/useSessionTimeout';
import { useAuthUser } from '@/lib/auth-client';
import SessionTimeoutModal from './session-timeout-modal';
import PublicFooter from './public-footer';
import SiteTopBar from './site-top-bar';
import AppSecondaryNav from './app-secondary-nav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuthUser();
  const { showWarning, remainingSeconds, resetTimer } = useSessionTimeout();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-body text-sm text-text-secondary">
        Loading…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-bg-body"
      style={{ ['--app-header-offset' as string]: '92px' }}
    >
      {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={resetTimer} />}

      <SiteTopBar logoHref="/dashboard" email={user?.email} role={user?.role} innerClassName="px-6" />
      <AppSecondaryNav user={user} key={pathname} />

      <main className="flex-1 p-6">
        <div className="max-w-layout mx-auto">{children}</div>
      </main>

      <PublicFooter />
    </div>
  );
}
