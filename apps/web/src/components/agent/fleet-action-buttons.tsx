'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Download, FileSpreadsheet } from 'lucide-react';
import { useAddServerModalOptional } from '@/components/servers/add-server-modal-context';

type Props = {
  className?: string;
  /** Hide bulk import (e.g. Operations Center dashboard). */
  showBulkImport?: boolean;
  /** Navigate to Servers then open add-server modal. */
  addServerOnServersPage?: boolean;
};

/** Primary fleet actions — agent download before add server. */
export function FleetActionButtons({
  className = '',
  showBulkImport = true,
  addServerOnServersPage = false,
}: Props) {
  const addServer = useAddServerModalOptional();
  const router = useRouter();

  const onAddServer = () => {
    if (addServerOnServersPage) {
      router.push('/servers?add=1');
      return;
    }
    addServer?.openAddServer();
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <Link
        href="/agents"
        className="h-9 px-4 bg-white text-dell-blue border border-dell-blue text-sm font-semibold rounded hover:bg-dell-blue/5 transition-colors flex items-center gap-1.5"
      >
        <Download className="w-4 h-4" /> Download Agent
      </Link>
      {showBulkImport && (
        <button
          type="button"
          onClick={() => addServer?.openBulkImport()}
          className="h-9 px-4 bg-white text-text-primary border border-border-card text-sm font-semibold rounded hover:bg-row-hover transition-colors flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" /> Bulk import
        </button>
      )}
      <button
        type="button"
        onClick={onAddServer}
        className="h-9 px-4 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center gap-1.5"
      >
        <PlusCircle className="w-4 h-4" /> Add Server
      </button>
    </div>
  );
}
