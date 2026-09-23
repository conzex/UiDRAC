'use client';

import AuthGate from '@/components/layout/auth-gate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate requireAdmin>{children}</AuthGate>;
}
