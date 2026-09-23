/** app-shell.tsx — Authenticated layout: blue header + white secondary nav. */
'use client';

import { useSessionTimeout } from '@/lib/useSessionTimeout';
import { useAuthUser } from '@/lib/auth-client';
import SessionTimeoutModal from './session-timeout-modal';
import PublicFooter from './public-footer';
import SiteTopBar from './site-top-bar';
import AppSecondaryNav from './app-secondary-nav';
import PageContainer from './page-container';

export const APP_HEADER_OFFSET_PX = 92;

export default function AppShell({ children }: { children: React.ReactNode }) {
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
      style={{ ['--app-header-offset' as string]: `${APP_HEADER_OFFSET_PX}px` }}
    >
      {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={resetTimer} />}

      <SiteTopBar logoHref="/dashboard" email={user?.email} role={user?.role} />
      <AppSecondaryNav user={user} />

      <main className="flex-1 py-6">
        <PageContainer>{children}</PageContainer>
      </main>

      <PublicFooter />
    </div>
  );
}
