'use client';

import { useState } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import { downloadAgentBundle } from '@/lib/agent-client';

type Props = {
  variant?: 'primary' | 'secondary';
  className?: string;
};

export function AgentDownloadButton({ variant = 'secondary', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const pick = async (platform: 'linux' | 'win' | 'darwin') => {
    setLoading(platform);
    setOpen(false);
    try {
      await downloadAgentBundle(platform);
    } finally {
      setLoading(null);
    }
  };

  const base =
    variant === 'primary'
      ? 'bg-white text-dell-blue border border-dell-blue hover:bg-dell-blue/5'
      : 'bg-dell-blue/10 text-dell-blue border border-dell-blue/30 hover:bg-dell-blue/15';

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!!loading}
        className={`px-4 py-2 text-sm font-semibold rounded transition-colors flex items-center gap-1.5 ${base}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loading ? 'Downloading…' : 'Agent Download'}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-white border border-border-card rounded shadow-lg py-1 text-sm">
            <p className="px-3 py-2 text-xs text-text-secondary border-b border-border-card">
              Your org-specific agent (install before Add Server in cloud mode)
            </p>
            {(
              [
                ['linux', 'Linux'],
                ['darwin', 'macOS'],
                ['win', 'Windows'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-text-primary"
                onClick={() => pick(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
