'use client';

import RequireMinRole from '@/components/layout/require-min-role';

export default function NewServerLayout({ children }: { children: React.ReactNode }) {
  return <RequireMinRole minimum="OPERATOR">{children}</RequireMinRole>;
}
