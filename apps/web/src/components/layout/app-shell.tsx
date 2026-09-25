/** app-shell.tsx — Authenticated layout: blue header + secondary app nav. */
'use client';

import AuthenticatedChrome, { AUTHENTICATED_HEADER_OFFSET_PX } from './authenticated-chrome';
import PageContainer from './page-container';
import { cn } from '@/lib/utils';

export const APP_HEADER_OFFSET_PX = AUTHENTICATED_HEADER_OFFSET_PX;

export default function AppShell({
  children,
  lockViewport = false,
}: {
  children: React.ReactNode;
  lockViewport?: boolean;
}) {
  return (
    <AuthenticatedChrome lockViewport={lockViewport}>
      <PageContainer className={cn(lockViewport && 'flex flex-col flex-1 min-h-0 py-4 sm:py-6')}>
        {children}
      </PageContainer>
    </AuthenticatedChrome>
  );
}
