'use client';

import Link from 'next/link';
import { PlusCircle, Download } from 'lucide-react';
import { useAddServerModalOptional } from '@/components/servers/add-server-modal-context';

/** Primary fleet actions — agent download before add server. */
export function FleetActionButtons({ className = '' }: { className?: string }) {
  const addServer = useAddServerModalOptional();

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <Link
        href="/agents"
        className="h-9 px-4 bg-white text-dell-blue border border-dell-blue text-sm font-semibold rounded hover:bg-dell-blue/5 transition-colors flex items-center gap-1.5"
      >
        <Download className="w-4 h-4" /> Download Agent
      </Link>
      <button
        type="button"
        onClick={() => addServer?.openAddServer()}
        className="h-9 px-4 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5"
      >
        <PlusCircle className="w-4 h-4" /> Add Server
      </button>
    </div>
  );
}
