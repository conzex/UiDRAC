'use client';

import AppShell from '@/components/layout/app-shell';
import AuthGate from '@/components/layout/auth-gate';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
