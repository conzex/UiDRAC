'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import AppPreloader from '@/components/layout/app-preloader';

function RouteLoadTracker({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathKey = pathname;
  const seen = useRef<string | null>(null);

  useEffect(() => {
    // Ignore query-only updates (e.g. /agents?manage=…) so modals do not flash the loader.
    void searchParams;
    if (seen.current !== null && seen.current !== pathKey) {
      onNavigate();
    }
    seen.current = pathKey;
  }, [pathKey, searchParams, onNavigate]);

  return null;
}

/** Brief branded overlay on in-app route changes (portaled above shell; safe with lockViewport). */
export default function RouteLoadProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const onNavigate = useCallback(() => {
    setShow(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShow(false), 220);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <RouteLoadTracker onNavigate={onNavigate} />
      </Suspense>
      {show && <AppPreloader overlay label="Loading" />}
      {children}
    </>
  );
}
