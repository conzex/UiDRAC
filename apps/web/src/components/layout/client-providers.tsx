'use client';

import { Suspense } from 'react';
import RouteLoadProvider from '@/components/layout/route-load-provider';

function RouteLoadFallback() {
  return null;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RouteLoadFallback />}>
      <RouteLoadProvider>{children}</RouteLoadProvider>
    </Suspense>
  );
}
