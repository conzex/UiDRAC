'use client';

import type { AgentPlatform } from '@/lib/agents-client';
import { detectClientPlatform, getAgentInstallGuide, platformLabel } from '@/lib/client-platform';
import { Copy, Check } from 'lucide-react';
import { useMemo, useState } from 'react';

type Props = {
  platform: AgentPlatform;
  detected?: AgentPlatform;
};

export function AgentInstallGuidePanel({ platform, detected }: Props) {
  const guide = useMemo(() => getAgentInstallGuide(platform), [platform]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const det = detected ?? detectClientPlatform();

  const copyBlock = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const allCommands = guide.commands.join('\n');

  return (
    <div className="mt-4 space-y-3">
      {det !== platform && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Your browser looks like <strong>{platformLabel(det)}</strong>, but you selected{' '}
          <strong>{platformLabel(platform)}</strong>. Choose the OS where the agent will <em>run</em>, not only this
          computer.
        </p>
      )}
      {det === platform && (
        <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">
          Recommended for this device: <strong>{platformLabel(platform)}</strong> package and steps below.
        </p>
      )}
      <p className="text-xs font-semibold text-text-primary">{guide.headline}</p>
      <ol className="text-xs text-text-secondary list-decimal list-inside space-y-1">
        {guide.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="relative">
        <pre className="text-[11px] font-mono bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto whitespace-pre-wrap">
          {allCommands}
        </pre>
        <button
          type="button"
          className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
          onClick={() => copyBlock(allCommands, -1)}
        >
          {copiedIdx === -1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {guide.note && <p className="text-[11px] text-text-secondary">{guide.note}</p>}
    </div>
  );
}
