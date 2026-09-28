/** Edge agent connection / lifecycle states (Conzex cloud product). */
export const AGENT_CONNECTION_STATES = [
  'connected',
  'disconnected',
  'connecting',
  'never_connected',
  'offline',
  'updating',
  'error',
  'disabled',
  'revoked',
] as const;

export type AgentConnectionState = (typeof AGENT_CONNECTION_STATES)[number];

export type AgentPlatformOs = 'windows' | 'linux' | 'darwin' | 'unknown';

export type AgentCpuArch = 'x64' | 'arm64' | 'ia32' | 'unknown';

export function normalizeAgentOs(raw?: string | null): AgentPlatformOs {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('win')) return 'windows';
  if (v.includes('darwin') || v.includes('mac')) return 'darwin';
  if (v.includes('linux')) return 'linux';
  return 'unknown';
}

export function normalizeAgentArch(raw?: string | null): AgentCpuArch {
  const v = (raw ?? '').toLowerCase();
  if (v === 'x64' || v === 'amd64') return 'x64';
  if (v === 'arm64' || v === 'aarch64') return 'arm64';
  if (v === 'ia32' || v === 'x86') return 'ia32';
  return 'unknown';
}
