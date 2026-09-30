import api from '@/lib/api';
import { setSessionSummary } from '@/lib/server-summary-session-cache';

const SLICE_TO_PATH: Record<string, string> = {
  dashboard: 'dashboard',
  system: 'system',
  storage: 'storage',
  configuration: 'configuration',
  maintenance: 'maintenance',
  'maintenance-diagnostics': 'maintenance/diagnostics',
  power: 'power',
  'idrac-settings': 'idrac-settings',
  'idrac-settings-advanced': 'idrac-settings/advanced',
};

export const IDRAC_SYNC_STEPS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'system', label: 'System' },
  { key: 'storage', label: 'Storage' },
  { key: 'configuration', label: 'Configuration' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'maintenance-diagnostics', label: 'Maintenance diagnostics' },
  { key: 'power', label: 'Power' },
  { key: 'idrac-settings', label: 'iDRAC settings' },
  { key: 'idrac-settings-advanced', label: 'iDRAC advanced' },
];

type WarmResponse = {
  warmedAt: string;
  refresh: boolean;
  slices: Record<string, unknown>;
  errors?: Record<string, string>;
};

const inflight = new Map<string, Promise<WarmResponse>>();
const warmListeners = new Map<string, Set<() => void>>();

export function subscribeServerWarm(serverId: string, listener: () => void) {
  let set = warmListeners.get(serverId);
  if (!set) {
    set = new Set();
    warmListeners.set(serverId, set);
  }
  set.add(listener);
  return () => set!.delete(listener);
}

function notifyWarm(serverId: string) {
  warmListeners.get(serverId)?.forEach((fn) => fn());
}

function applyWarmToSession(serverId: string, data: WarmResponse) {
  for (const [key, path] of Object.entries(SLICE_TO_PATH)) {
    const payload = data.slices[key];
    if (payload) setSessionSummary(`/servers/${serverId}/summary/${path}`, payload);
  }
}

/** Sync all server tabs in one backend pass; fills session cache for instant tab switches. */
export function warmServerSummaries(serverId: string, refresh = false): Promise<WarmResponse> {
  const existing = inflight.get(serverId);
  if (existing) return existing;

  const job = api
    .post<WarmResponse>(`/servers/${serverId}/summary/warm`, null, {
      params: refresh ? { refresh: 'true' } : undefined,
      timeout: 600_000,
    })
    .then((r) => {
      applyWarmToSession(serverId, r.data);
      notifyWarm(serverId);
      return r.data;
    })
    .finally(() => {
      inflight.delete(serverId);
    });

  inflight.set(serverId, job);
  return job;
}

export function isServerSummariesWarming(serverId: string): boolean {
  return inflight.has(serverId);
}

export type SyncProgressFn = (percent: number, stepLabel: string) => void;

/** Manual sync — one slice at a time so UI can show real progress (%). */
export async function syncServerFromIdrac(serverId: string, onProgress: SyncProgressFn) {
  const existing = inflight.get(serverId);
  if (existing) {
    onProgress(5, 'Waiting for sync already in progress…');
    await existing;
    onProgress(100, 'Complete');
    return;
  }

  const total = IDRAC_SYNC_STEPS.length;
  const errors: Record<string, string> = {};

  const job = (async () => {
    onProgress(0, 'Connecting to iDRAC…');
    for (let i = 0; i < IDRAC_SYNC_STEPS.length; i++) {
      const step = IDRAC_SYNC_STEPS[i];
      const path = SLICE_TO_PATH[step.key];
      const pctBefore = Math.round((i / total) * 100);
      onProgress(pctBefore, `Syncing ${step.label}…`);

      try {
        const { data } = await api.get(`/servers/${serverId}/summary/${path}`, {
          params: { refresh: 'true' },
          timeout: 180_000,
        });
        setSessionSummary(`/servers/${serverId}/summary/${path}`, data);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        errors[step.key] = e?.response?.data?.message || e?.message || 'Sync failed';
      }

      onProgress(Math.round(((i + 1) / total) * 100), step.label);
    }

    notifyWarm(serverId);
    return {
      warmedAt: new Date().toISOString(),
      refresh: true,
      slices: {},
      errors: Object.keys(errors).length ? errors : undefined,
    } satisfies WarmResponse;
  })();

  inflight.set(serverId, job);
  try {
    return await job;
  } finally {
    inflight.delete(serverId);
  }
}
