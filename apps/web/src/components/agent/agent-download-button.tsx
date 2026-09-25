'use client';

import { useState } from 'react';
import { APP_VERSION_LABEL } from '@idrac/shared';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import { downloadAgentBundle, type AgentPlatform } from '@/lib/agent-client';
import { AgentPlatformIcon } from './agent-platform-icon';

const PLATFORMS: { id: AgentPlatform; label: string }[] = [
  { id: 'linux', label: 'Linux' },
  { id: 'darwin', label: 'macOS' },
  { id: 'win', label: 'Windows' },
];

type Props = {
  variant?: 'primary' | 'secondary';
  className?: string;
};

export function AgentDownloadButton({ variant = 'secondary', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<AgentPlatform | null>(null);
  const [error, setError] = useState('');

  const pick = async (platform: AgentPlatform, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(platform);
    setError('');
    try {
      await downloadAgentBundle(platform);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  const base =
    variant === 'primary'
      ? 'bg-white text-dell-blue border border-dell-blue hover:bg-dell-blue/5'
      : 'bg-dell-blue/10 text-dell-blue border border-dell-blue/30 hover:bg-dell-blue/15';

  return (
    <div className={`relative inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={!!loading}
        className={`px-4 py-2 text-sm font-semibold rounded transition-colors flex items-center gap-1.5 ${base}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loading ? 'Downloading…' : 'Agent download'}
        <span className="text-[11px] font-normal opacity-80 tabular-nums">{APP_VERSION_LABEL}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {error && <p className="text-xs text-red-critical max-w-xs text-right">{error}</p>}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full mt-1 z-[110] min-w-[260px] bg-white border border-border-card rounded shadow-lg py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border-card">
              Bundle for agent release {APP_VERSION_LABEL}
            </div>
            {PLATFORMS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-text-primary flex items-center gap-3"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => pick(id, e)}
              >
                <AgentPlatformIcon platform={id} label={label} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
