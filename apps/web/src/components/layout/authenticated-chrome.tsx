/** Logged-in shell: blue top bar + white app nav (Dashboard, Servers, …). */
'use client';

import { useSessionTimeout } from '@/lib/useSessionTimeout';
import { useAuthUser } from '@/lib/auth-client';
import SessionTimeoutModal from './session-timeout-modal';
import PublicFooter from './public-footer';
import SiteTopBar from './site-top-bar';
import AppSecondaryNav from './app-secondary-nav';
import AppPreloader from '@/components/layout/app-preloader';
import PageContainer from './page-container';
import { cn } from '@/lib/utils';

export const AUTHENTICATED_HEADER_OFFSET_PX = 92;

type AuthenticatedChromeProps = {
  children: React.ReactNode;
  lockViewport?: boolean;
  /** Skip default main padding (e.g. full-bleed home hero). */
  flushMain?: boolean;
  showFooter?: boolean;
};

export default function AuthenticatedChrome({
  children,
  lockViewport = false,
  flushMain = false,
  showFooter = true,
}: AuthenticatedChromeProps) {
  const { user, ready } = useAuthUser();
  const { showWarning, remainingSeconds, resetTimer } = useSessionTimeout();

  if (!ready) {
    return <AppPreloader />;
  }

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col bg-bg-body',
        lockViewport && 'h-dvh max-h-dvh overflow-hidden',
      )}
      style={{ ['--app-header-offset' as string]: `${AUTHENTICATED_HEADER_OFFSET_PX}px` }}
    >
      {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={resetTimer} />}

      <SiteTopBar email={user?.email} role={user?.role} />
      <AppSecondaryNav user={user} />

      <main
        className={cn(
          'flex-1 bg-bg-body min-h-0',
          lockViewport && 'flex flex-col overflow-hidden',
          !flushMain && !lockViewport && 'py-5 sm:py-7',
          lockViewport && 'py-0 flex flex-col',
        )}
      >
        {flushMain || lockViewport ? (
          children
        ) : (
          <PageContainer className={cn(lockViewport && 'flex flex-col flex-1 min-h-0 py-3 sm:py-4')}>{children}</PageContainer>
        )}
      </main>

      {showFooter && <PublicFooter />}
    </div>
  );
}
