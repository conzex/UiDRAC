'use client';

/** Wraps app shell; route transition overlay removed (it delayed every navigation). */
export default function RouteLoadProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
