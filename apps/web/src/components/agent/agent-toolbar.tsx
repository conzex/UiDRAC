'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { AgentDownloadButton } from './agent-download-button';
import { AgentStatusBanner } from './agent-status-banner';
import { useAgentStatus } from '@/lib/agent-client';

const ORG_AGENT_HINT = 'Your org-specific agent (install before Add Server in cloud mode)';

/** Agent download + unique org agent ID — shown above fleet actions. */
export function AgentToolbar({ className = '' }: { className?: string }) {
  const { status, error: statusError } = useAgentStatus();
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    if (!status?.publicId) return;
    await navigator.clipboard.writeText(status.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <AgentStatusBanner status={status} />
      {statusError && (
        <p className="text-sm text-red-critical bg-red-50 border border-red-200 rounded px-3 py-2">{statusError}</p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-border-card rounded">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{ORG_AGENT_HINT}</p>
          {status?.publicId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-secondary shrink-0">Unique agent ID</span>
              <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all text-text-primary">{status.publicId}</code>
              <button
                type="button"
                onClick={copyId}
                className="inline-flex items-center gap-1 text-xs text-dell-blue hover:underline shrink-0"
                title="Copy agent ID"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-secondary mt-1">Loading agent identity…</p>
          )}
        </div>
        <AgentDownloadButton publicId={status?.publicId} className="sm:shrink-0" />
      </div>
    </div>
  );
}

export { ORG_AGENT_HINT };
