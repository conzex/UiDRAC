'use client';

import { Suspense } from 'react';
import RouteLoadProvider from '@/components/layout/route-load-provider';
import AppPreloader from '@/components/layout/app-preloader';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppPreloader label="Loading page" />}>
      <RouteLoadProvider>{children}</RouteLoadProvider>
    </Suspense>
  );
}
