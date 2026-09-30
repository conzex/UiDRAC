'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

type Props = {
  agentId: string;
  label?: string;
  className?: string;
};

/** Full agent public ID with one-click copy. */
export function AgentIdCopy({ agentId, label = 'Agent ID', className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={className}>
      {label ? (
        <p className="text-text-secondary text-xs uppercase tracking-wide mb-1">{label}</p>
      ) : null}
      <div className="flex items-start gap-2">
        <code className="flex-1 text-xs font-mono break-all bg-bg-body border border-border-card rounded px-2 py-1.5">
          {agentId}
        </code>
        <button
          type="button"
          title="Copy full agent ID"
          className="shrink-0 p-2 border border-border-card rounded hover:bg-gray-50"
          onClick={async () => {
            await navigator.clipboard.writeText(agentId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
