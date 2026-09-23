/** useSessionTimeout.ts — Tracks user inactivity and auto-logs out after configurable timeout. */
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_MS = 15 * 60 * 1000;      // 15 minutes of inactivity
const WARNING_MS = 2 * 60 * 1000;       // show warning 2 minutes before logout
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;
const TICK_INTERVAL = 1000;

export interface SessionTimeoutState {
  showWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
}

export function useSessionTimeout(): SessionTimeoutState {
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  const performLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login?reason=timeout');
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (showWarning) setShowWarning(false);
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        clearInterval(interval);
        performLogout();
        return;
      }

      if (remaining <= WARNING_MS) {
        setShowWarning(true);
        setRemainingSeconds(Math.ceil(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    }, TICK_INTERVAL);

    return () => {
      clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [performLogout, showWarning]);

  return { showWarning, remainingSeconds, resetTimer };
}
