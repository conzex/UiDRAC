/** Public pages: header + main + footer (logged-in users get app nav chrome). */
'use client';

import PublicHeader from './public-header';
import PublicFooter from './public-footer';
import PageContainer from './page-container';
import AuthenticatedChrome from './authenticated-chrome';
import AppPreloader from './app-preloader';
import { useAuthUser } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type PublicChromeProps = {
  children: React.ReactNode;
  mainClassName?: string;
  lockViewport?: boolean;
  contained?: boolean;
};

export default function PublicChrome({
  children,
  mainClassName,
  lockViewport = false,
  contained = true,
}: PublicChromeProps) {
  const { loggedIn, ready } = useAuthUser();

  if (!ready) {
    return <AppPreloader />;
  }

  if (loggedIn) {
    return (
      <AuthenticatedChrome lockViewport={lockViewport}>
        {contained ? (
          <PageContainer className={cn(lockViewport && 'flex flex-col flex-1 min-h-0 py-3 sm:py-4', mainClassName)}>
            {children}
          </PageContainer>
        ) : (
          <div className={cn('flex-1', mainClassName)}>{children}</div>
        )}
      </AuthenticatedChrome>
    );
  }

  return (
    <div className={cn('min-h-screen flex flex-col bg-bg-body', lockViewport && 'h-dvh max-h-dvh overflow-hidden')}>
      <PublicHeader />
      <main
        className={cn(
          'flex-1 bg-bg-body',
          lockViewport && 'flex flex-col min-h-0 overflow-hidden',
          !mainClassName?.includes('py-') && 'py-5 sm:py-7',
          mainClassName,
        )}
      >
        {contained ? (
          <PageContainer className={cn(lockViewport && 'flex flex-col flex-1 min-h-0')}>{children}</PageContainer>
        ) : (
          children
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
