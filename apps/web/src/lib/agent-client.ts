'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { UIDRAC_AGENT_BUNDLE_PREFIX } from '@idrac/shared';

/** Platform icons for agent download menu (Flaticon CDN + local fallback). */
export const AGENT_PLATFORM_LOGOS = {
  linux: 'https://cdn-icons-png.flaticon.com/512/6124/6124995.png',
  win: 'https://cdn-icons-png.flaticon.com/512/220/220215.png',
  darwin: 'https://cdn-icons-png.flaticon.com/256/0/747.png',
} as const;

export const AGENT_PLATFORM_LOGOS_FALLBACK = {
  linux: '/agent/linux.png',
  win: '/agent/windows.png',
  darwin: '/agent/macos.png',
} as const;

export type AgentPlatform = keyof typeof AGENT_PLATFORM_LOGOS;

export type AgentStatus = {
  publicId: string;
  connected: boolean;
  requireEdgeAgent: boolean;
  lastConnectedAt: string | null;
  lastSeenIp: string | null;
  agentVersion: string | null;
  releaseAgentVersion?: string;
  wsUrl: string;
  cloudUrl: string;
};

export function useAgentStatus(pollMs = 15_000) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    api
      .get('/agent/status')
      .then((r) => {
        setStatus(r.data);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        const code = err.response?.status;
        if (code === 404) {
          setError('Agent API not loaded. Rebuild the API service (docker compose up -d --build api).');
        } else {
          setError(err.response?.data?.message || 'Unable to load agent status');
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { status, loading, error, refresh };
}

async function readApiError(err: unknown): Promise<string> {
  const ax = err as { response?: { status?: number; data?: Blob | { message?: string } } };
  if (ax.response?.status === 404) {
    return 'Agent download endpoint not found. Rebuild and restart the API: docker compose up -d --build api';
  }
  const data = ax.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      /* ignore */
    }
  } else if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'Agent download failed. Check that the API is running and your session is valid.';
}

export async function downloadAgentBundle(platform: 'linux' | 'win' | 'darwin') {
  try {
    const res = await api.get('/agent/download', { params: { platform }, responseType: 'blob' });
    saveAgentBlob(res.data, `${UIDRAC_AGENT_BUNDLE_PREFIX}-${platform}.json`);
  } catch (err) {
    throw new Error(await readApiError(err));
  }
}

export async function rotateAgentCredentials() {
  try {
    const res = await api.post('/agent/rotate', null, { responseType: 'blob' });
    saveAgentBlob(res.data, `${UIDRAC_AGENT_BUNDLE_PREFIX}-linux.json`);
  } catch (err) {
    throw new Error(await readApiError(err));
  }
}

function saveAgentBlob(data: BlobPart, filename: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
