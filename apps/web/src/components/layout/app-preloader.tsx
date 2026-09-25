'use client';

import { PRODUCT_NAME } from '@idrac/shared';

type AppPreloaderProps = {
  /** When false, only the inline spinner row is shown (route transitions). */
  fullScreen?: boolean;
  label?: string;
};

export default function AppPreloader({ fullScreen = true, label = 'Loading' }: AppPreloaderProps) {
  const spinner = (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16" aria-hidden>
      <div className="absolute inset-0 rounded-full border-2 border-dell-blue/20 border-t-dell-blue animate-spin" />
      <img
        src="/logo.png"
        alt=""
        className="absolute inset-0 m-auto h-7 sm:h-8 w-auto opacity-95 pointer-events-none"
      />
    </div>
  );

  const inner = (
    <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
      {spinner}
      <p className="text-sm text-text-secondary font-medium">{label}</p>
      <span className="sr-only">{PRODUCT_NAME}</span>
    </div>
  );

  if (!fullScreen) {
    return <div className="py-10">{inner}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-body" role="status" aria-live="polite">
      {inner}
    </div>
  );
}
