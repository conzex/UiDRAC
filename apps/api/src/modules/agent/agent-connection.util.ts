/** Compute live agent connection state from DB + bridge (no stale "connected" from old sessions). */
import type { AgentConnectionState } from '@idrac/shared';

const HEARTBEAT_STALE_MS = 45_000;
const OFFLINE_MS = 120_000;

export type AgentRecordForStatus = {
  publicId: string;
  firstRegisteredAt: Date | null;
  lastConnectedAt: Date | null;
  lastHeartbeatAt: Date | null;
  revokedAt: Date | null;
  disabledAt: Date | null;
  agentVersion: string | null;
  updateState: string;
};

export function computeAgentConnectionState(
  agent: AgentRecordForStatus,
  opts: { socketOpen: boolean; now?: Date },
): AgentConnectionState {
  const now = opts.now ?? new Date();
  if (agent.revokedAt) return 'revoked';
  if (agent.disabledAt) return 'disabled';
  if (agent.updateState === 'updating') return 'updating';
  if (opts.socketOpen) return 'connected';

  const lastSignal = agent.lastHeartbeatAt ?? agent.lastConnectedAt;
  if (!agent.firstRegisteredAt && !lastSignal) return 'never_connected';

  if (lastSignal) {
    const age = now.getTime() - lastSignal.getTime();
    if (age <= HEARTBEAT_STALE_MS) return 'disconnected';
    if (age <= OFFLINE_MS) return 'disconnected';
    return 'offline';
  }

  return 'never_connected';
}

export function aggregateTenantConnectionState(states: AgentConnectionState[]): AgentConnectionState {
  if (states.some((s) => s === 'connected')) return 'connected';
  if (states.some((s) => s === 'connecting')) return 'connecting';
  if (states.every((s) => s === 'never_connected')) return 'never_connected';
  if (states.some((s) => s === 'error')) return 'error';
  if (states.some((s) => s === 'updating')) return 'updating';
  if (states.every((s) => s === 'revoked' || s === 'disabled')) {
    return states.some((s) => s === 'revoked') ? 'revoked' : 'disabled';
  }
  if (states.some((s) => s === 'offline')) return 'offline';
  return 'disconnected';
}
