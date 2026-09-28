'use client';

import { ArrowLeft } from 'lucide-react';
import { goHomeAndResetSession } from '@/lib/auth-client';

type Props = {
  className?: string;
};

/** Leaves auth pages, clears tokens/cache, replaces history so Forward cannot reopen the form. */
export function BackToHomeButton({ className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={() => goHomeAndResetSession()}
      className={`inline-flex items-center gap-1.5 text-sm text-dell-blue hover:underline font-medium ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Back to home
    </button>
  );
}
