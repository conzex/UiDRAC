'use client';

import { usePathname } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import AuthGate from '@/components/layout/auth-gate';
import { AddServerModalProvider } from '@/components/servers/add-server-modal-context';
import { AddServerModal } from '@/components/servers/add-server-modal';
import { BulkImportServersModal } from '@/components/servers/bulk-import-servers-modal';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lockViewport = pathname === '/agents' || (pathname?.startsWith('/agents/') ?? false);

  return (
    <AuthGate>
      <AddServerModalProvider>
        <AppShell lockViewport={lockViewport}>{children}</AppShell>
        <AddServerModal />
        <BulkImportServersModal />
      </AddServerModalProvider>
    </AuthGate>
  );
}
