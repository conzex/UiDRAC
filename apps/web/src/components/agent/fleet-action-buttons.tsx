'use client';

import { PlusCircle } from 'lucide-react';
import { AgentDownloadButton } from './agent-download-button';
import { useAddServerModalOptional } from '@/components/servers/add-server-modal-context';

/** Primary fleet actions — agent download always before add server. */
export function FleetActionButtons({ className = '' }: { className?: string }) {
  const addServer = useAddServerModalOptional();

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <AgentDownloadButton />
      <button
        type="button"
        onClick={() => addServer?.openAddServer()}
        className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5"
      >
        <PlusCircle className="w-4 h-4" /> Add Server
      </button>
    </div>
  );
}
