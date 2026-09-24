'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

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
        setError(err.response?.data?.message || 'Unable to load agent status');
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

export async function downloadAgentBundle(platform: 'linux' | 'win' | 'darwin') {
  const res = await api.get('/agent/download', { params: { platform }, responseType: 'blob' });
  saveAgentBlob(res.data, `idrac-agent-${platform}.json`);
}

export async function rotateAgentCredentials() {
  const res = await api.post('/agent/rotate', null, { responseType: 'blob' });
  saveAgentBlob(res.data, 'idrac-agent-linux.json');
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
