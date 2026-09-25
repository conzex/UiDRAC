'use client';

import AppShell from '@/components/layout/app-shell';
import AuthGate from '@/components/layout/auth-gate';
import { AddServerModalProvider } from '@/components/servers/add-server-modal-context';
import { AddServerModal } from '@/components/servers/add-server-modal';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AddServerModalProvider>
        <AppShell>{children}</AppShell>
        <AddServerModal />
      </AddServerModalProvider>
    </AuthGate>
  );
}
