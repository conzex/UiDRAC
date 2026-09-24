'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export const ORG_AGENT_HINT = 'Your org-specific agent (install before Add Server in cloud mode)';

export type AgentStatus = {
  publicId: string;
  connected: boolean;
  requireEdgeAgent: boolean;
  lastConnectedAt: string | null;
  lastSeenIp: string | null;
  agentVersion: string | null;
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
    saveAgentBlob(res.data, `idrac-agent-${platform}.json`);
  } catch (err) {
    throw new Error(await readApiError(err));
  }
}

export async function rotateAgentCredentials() {
  try {
    const res = await api.post('/agent/rotate', null, { responseType: 'blob' });
    saveAgentBlob(res.data, 'idrac-agent-linux.json');
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
