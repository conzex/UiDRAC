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

export type AgentDownloadFormat = 'installer' | 'json';

export type AgentStatus = {
  publicId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  lockedToTenant: true;
  credentialsRotatedAt: string | null;
  connected: boolean;
  status?: import('@idrac/shared').AgentConnectionState;
  agentCount?: number;
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

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const m = /filename="([^"]+)"/i.exec(header);
  return m?.[1] ?? fallback;
}

async function readApiError(err: unknown): Promise<string> {
  const ax = err as { response?: { status?: number; data?: Blob | { message?: string } } };
  const status = ax.response?.status;
  if (status === 404) {
    return 'Agent API endpoint not found. Rebuild and restart the API: docker compose up -d --build api';
  }
  if (status === 403) {
    return 'You need ADMIN or OWNER role to rotate agent credentials.';
  }
  const data = ax.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string; statusCode?: number };
      if (parsed.message) return parsed.message;
      if (parsed.statusCode === 500) {
        return 'Server error building agent package. Rebuild the API container (docker compose up -d --build api).';
      }
    } catch {
      /* ignore */
    }
  } else if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  if (status === 500) {
    return 'Internal server error. Rebuild the API (docker compose up -d --build api) and try again.';
  }
  return 'Agent request failed. Check that the API is running and your session is valid.';
}

function saveBlob(data: BlobPart, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Tenant-locked agent: ZIP installer (default) or JSON credentials only. */
export async function downloadAgentBundle(platform: AgentPlatform, format: AgentDownloadFormat = 'installer') {
  try {
    const params =
      format === 'json' ? { platform, format: 'json' } : { platform };
    const res = await api.get('/agent/download', { params, responseType: 'blob' });
    const disposition = res.headers['content-disposition'] as string | undefined;
    if (format === 'json') {
      const name = filenameFromDisposition(disposition, `${UIDRAC_AGENT_BUNDLE_PREFIX}-${platform}.json`);
      saveBlob(res.data, name, 'application/json');
      return;
    }
    const zipName = filenameFromDisposition(disposition, `UidracAgent-${platform}.zip`);
    saveBlob(res.data, zipName, 'application/zip');
  } catch (err) {
    throw new Error(await readApiError(err));
  }
}

export async function rotateAgentCredentials(platform: AgentPlatform = 'linux', format: AgentDownloadFormat = 'installer') {
  try {
    const params =
      format === 'json' ? { platform, format: 'json' } : { platform };
    const res = await api.post('/agent/rotate', null, { params, responseType: 'blob' });
    const disposition = res.headers['content-disposition'] as string | undefined;
    if (format === 'json') {
      saveBlob(res.data, filenameFromDisposition(disposition, `${UIDRAC_AGENT_BUNDLE_PREFIX}-${platform}.json`), 'application/json');
      return;
    }
    saveBlob(res.data, filenameFromDisposition(disposition, `UidracAgent-${platform}.zip`), 'application/zip');
  } catch (err) {
    throw new Error(await readApiError(err));
  }
}
