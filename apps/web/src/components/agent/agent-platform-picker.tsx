'use client';

import type { AgentPlatform } from '@/lib/agents-client';
import { detectClientPlatform, platformLabel } from '@/lib/client-platform';
import { AgentPlatformIcon } from './agent-platform-icon';

const PLATFORMS: AgentPlatform[] = ['darwin', 'win', 'linux'];

type Props = {
  value: AgentPlatform;
  onChange: (p: AgentPlatform) => void;
};

export function AgentPlatformPicker({ value, onChange }: Props) {
  const detected = detectClientPlatform();

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-secondary">
        Detected device: <strong>{platformLabel(detected)}</strong> — pick where you will install the agent.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PLATFORMS.map((id) => {
          const active = value === id;
          const recommended = id === detected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded border text-xs font-medium transition-colors ${
                active
                  ? 'border-dell-blue bg-dell-blue/10 text-dell-blue'
                  : 'border-border-card hover:bg-gray-50 text-text-primary'
              }`}
            >
              <AgentPlatformIcon platform={id} label="" />
              <span>{platformLabel(id)}</span>
              {recommended && (
                <span className="text-[10px] font-normal text-green-700">Recommended</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
