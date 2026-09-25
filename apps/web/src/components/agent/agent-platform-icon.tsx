'use client';

import { useState } from 'react';
import {
  AGENT_PLATFORM_LOGOS,
  AGENT_PLATFORM_LOGOS_FALLBACK,
  type AgentPlatform,
} from '@/lib/agent-client';

export function AgentPlatformIcon({ platform, label }: { platform: AgentPlatform; label: string }) {
  const [src, setSrc] = useState<string>(AGENT_PLATFORM_LOGOS[platform]);

  return (
    <img
      src={src}
      alt={label}
      width={22}
      height={22}
      draggable={false}
      referrerPolicy="no-referrer"
      className="w-[22px] h-[22px] object-contain shrink-0 pointer-events-none select-none"
      onError={() => {
        const fallback = AGENT_PLATFORM_LOGOS_FALLBACK[platform];
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
