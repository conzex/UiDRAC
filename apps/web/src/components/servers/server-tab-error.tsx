'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ServerTabError({ message, onRetry }: Props) {
  return (
    <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-red-critical mx-auto mb-2" />
      <p className="text-sm text-red-critical mb-4 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      )}
    </div>
  );
}
