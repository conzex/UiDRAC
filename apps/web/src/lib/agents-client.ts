'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { UIDRAC_AGENT_BUNDLE_PREFIX, APP_VERSION_LABEL, type AgentConnectionState } from '@idrac/shared';
import AppPageHeader from '@/components/layout/app-page-header';
import { AgentPlatformIcon } from '@/components/agent/agent-platform-icon';
import Link from 'next/link';
import { Download, Loader2, RefreshCw, Plus, ChevronRight } from 'lucide-react';
import { readStoredUser } from '@/lib/auth-client';

export type AgentPlatform = 'linux' | 'darwin' | 'win';

export type AgentRow = {
  id: string;
  publicId: string;
  name: string;
  isPrimary?: boolean;
  status: AgentConnectionState;
  connected: boolean;
  os: string | null;
  arch: string | null;
  hostname: string | null;
  agentVersion: string | null;
  releaseAgentVersion: string;
  lastConnectedAt: string | null;
  lastHeartbeatAt: string | null;
  cloudUrl: string;
};

export type AgentDownloadMeta = {
  latestVersion: string;
  productionCloudUrl: string;
  platforms: { id: AgentPlatform; label: string; architectures: string[] }[];
  requirements: Record<string, string>;
};

const STATUS_LABEL: Record<AgentConnectionState, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  never_connected: 'Never connected',
  offline: 'Offline',
  updating: 'Updating',
  error: 'Error',
  disabled: 'Disabled',
  revoked: 'Revoked',
};

export function statusBadgeClass(status: AgentConnectionState): string {
  if (status === 'connected') return 'bg-green-100 text-green-800';
  if (status === 'never_connected') return 'bg-gray-100 text-gray-700';
  if (status === 'revoked' || status === 'disabled') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-900';
}

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const m = /filename="([^"]+)"/i.exec(header);
  return m?.[1] ?? fallback;
}

async function readApiError(err: unknown): Promise<string> {
  const ax = err as { response?: { status?: number; data?: Blob | { message?: string } } };
  const status = ax.response?.status;
  if (status === 403) return 'You do not have permission for this action.';
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
  return status === 500 ? 'Server error. Try again or contact support.' : 'Request failed.';
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

export function useAgentsList(pollMs = 10_000) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    api
      .get<AgentRow[]>('/agents')
      .then((r) => {
        setAgents(r.data);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Unable to load agents');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { agents, loading, error, refresh };
}

export function useAgentDownloadMeta() {
  const [meta, setMeta] = useState<AgentDownloadMeta | null>(null);
  useEffect(() => {
    api.get<AgentDownloadMeta>('/agents/download/meta').then((r) => setMeta(r.data)).catch(() => {});
  }, []);
  return meta;
}

export async function downloadAgentForId(
  agentId: string,
  platform: AgentPlatform,
  arch: string,
): Promise<{ checksum?: string }> {
  const res = await api.get(`/agents/${agentId}/download`, {
    params: { platform, arch },
    responseType: 'blob',
  });
  const disposition = res.headers['content-disposition'] as string | undefined;
  const checksum = res.headers['x-checksum-sha256'] as string | undefined;
  saveBlob(
    res.data,
    filenameFromDisposition(disposition, `UidracAgent-${platform}.zip`),
    'application/zip',
  );
  return { checksum };
}

export async function registerNewAgent(name?: string): Promise<AgentRow> {
  const res = await api.post<AgentRow>('/agents/register', { name });
  return res.data;
}

export { STATUS_LABEL, readApiError };
