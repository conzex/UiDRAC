'use client';

import { useMemo, useState } from 'react';
import { Download, ExternalLink, Copy, Check, Loader2, FileJson } from 'lucide-react';
import type { AgentPlatform, AgentRow } from '@/lib/agents-client';
import { downloadAgentCredentials } from '@/lib/agents-client';
import { detectClientPlatform, getAgentInstallGuide, platformLabel } from '@/lib/client-platform';
import { AgentPlatformPicker } from '@/components/agent/agent-platform-picker';
import { agentCdnInstallerUrl, AGENT_CDN_BASE_URL } from '@idrac/shared';

type Props = {
  agents: AgentRow[];
  selectedAgentId: string;
  onSelectAgentId: (id: string) => void;
  canManage: boolean;
  cdnBaseUrl?: string;
};

export function AgentDownloadPanel({
  agents,
  selectedAgentId,
  onSelectAgentId,
  canManage,
  cdnBaseUrl = AGENT_CDN_BASE_URL,
}: Props) {
  const [platform, setPlatform] = useState<AgentPlatform>(() => detectClientPlatform());
  const [busy, setBusy] = useState<'cred' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);

  const selected = agents.find((a) => a.id === selectedAgentId);
  const guide = useMemo(() => getAgentInstallGuide(platform, cdnBaseUrl), [platform, cdnBaseUrl]);
  const installerUrl = agentCdnInstallerUrl(platform, cdnBaseUrl);
  const commandBlock = guide.commands.join('\n');

  const onCredentials = async () => {
    if (!selectedAgentId || selected?.status === 'revoked') {
      setError('Select an active agent first.');
      return;
    }
    setBusy('cred');
    setError('');
    try {
      await downloadAgentCredentials(selectedAgentId, platform);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  };

  const copyCommands = async () => {
    await navigator.clipboard.writeText(commandBlock);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-3">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Site agent</label>
      <select
        value={selectedAgentId}
        onChange={(e) => onSelectAgentId(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border-card rounded bg-white"
      >
        {agents.map((a) => (
          <option key={a.id} value={a.id} disabled={a.status === 'revoked'}>
            {a.name}
          </option>
        ))}
      </select>

      <AgentPlatformPicker value={platform} onChange={setPlatform} />

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          disabled={!canManage || busy !== null}
          onClick={() => void onCredentials()}
          className="w-full py-2 flex items-center justify-center gap-2 bg-white border border-dell-blue text-dell-blue text-sm font-semibold rounded hover:bg-blue-50 disabled:opacity-50"
        >
          {busy === 'cred' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
          Download credentials.json
        </button>
        <a
          href={installerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 flex items-center justify-center gap-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover"
        >
          <Download className="w-4 h-4" />
          {guide.installerName}
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      <p className="text-[10px] text-text-secondary break-all">
        CDN: <span className="font-mono">{installerUrl}</span>
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        className="text-xs text-dell-blue font-medium hover:underline"
        onClick={() => setShowTerminal((v) => !v)}
      >
        {showTerminal ? 'Hide' : 'Show'} manual / Terminal install ({platformLabel(platform)})
      </button>

      {showTerminal && (
        <div className="space-y-2 border-t border-border-card pt-3">
          <p className="text-xs font-semibold text-text-primary">{guide.headline}</p>
          <ol className="text-[11px] text-text-secondary list-decimal list-inside space-y-0.5">
            {guide.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="relative">
            <pre className="text-[10px] font-mono bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto whitespace-pre-wrap">
              {commandBlock}
            </pre>
            <button
              type="button"
              className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
              onClick={() => void copyCommands()}
              aria-label="Copy commands"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {guide.note && <p className="text-[10px] text-text-secondary">{guide.note}</p>}
        </div>
      )}
    </div>
  );
}
