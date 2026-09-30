/** In-memory agent status relayed to the portal UiDRAC Agent console. */
export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  id: string;
  at: string;
  level: LogLevel;
  message: string;
};

export type IdracActivityRow = {
  id: string;
  at: string;
  event: 'probe' | 'auth' | 'connect' | 'disconnect' | 'invoke';
  ip: string;
  serviceTag: string;
  model: string;
  generation: string;
  health: string;
  result: 'ok' | 'fail' | 'pending';
  detail: string;
};

export type AgentSnapshot = {
  version: string;
  cloudUrl: string;
  wsUrl: string;
  agentId: string;
  tenantId: string;
  tenantName: string;
  cloudConnected: boolean;
  authenticated: boolean;
  lastError: string | null;
  startedAt: string;
};

const MAX_ROWS = 200;

const rows: IdracActivityRow[] = [];
let snapshot: AgentSnapshot = {
  version: '',
  cloudUrl: '',
  wsUrl: '',
  agentId: '',
  tenantId: '',
  tenantName: '',
  cloudConnected: false,
  authenticated: false,
  lastError: null,
  startedAt: new Date().toISOString(),
};
let cloudRelay: ((payload: Record<string, unknown>) => void) | null = null;

export function setCloudEventRelay(relay: ((payload: Record<string, unknown>) => void) | null) {
  cloudRelay = relay;
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function initAgentState(partial: Partial<AgentSnapshot>) {
  snapshot = { ...snapshot, ...partial, startedAt: new Date().toISOString() };
}

export function getSnapshot(): AgentSnapshot {
  return { ...snapshot };
}

export function setCloudConnected(connected: boolean) {
  snapshot.cloudConnected = connected;
  if (!connected) snapshot.authenticated = false;
  relaySnapshotToCloud();
}

export function setAuthenticated(ok: boolean, error?: string) {
  snapshot.authenticated = ok;
  snapshot.lastError = ok ? null : error ?? snapshot.lastError;
  relaySnapshotToCloud();
}

export function pushLog(level: LogLevel, message: string) {
  const at = new Date().toISOString();
  const line = `[edge-agent] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  cloudRelay?.({ type: 'agent.log', level, message, at });
}

export function pushActivity(row: Omit<IdracActivityRow, 'id' | 'at'> & { at?: string }) {
  const full: IdracActivityRow = {
    id: id(),
    at: row.at ?? new Date().toISOString(),
    ...row,
  };
  rows.unshift(full);
  if (rows.length > MAX_ROWS) rows.pop();
  const { id: rowId, ...activityPayload } = full;
  cloudRelay?.({ type: 'agent.activity', id: rowId, ...activityPayload });
  return full;
}

export function relaySnapshotToCloud() {
  const s = getSnapshot();
  cloudRelay?.({
    type: 'agent.snapshot',
    version: s.version,
    cloudUrl: s.cloudUrl,
    wsUrl: s.wsUrl,
    agentId: s.agentId,
    tenantId: s.tenantId,
    tenantName: s.tenantName,
    cloudConnected: s.cloudConnected,
    authenticated: s.authenticated,
    lastError: s.lastError,
    startedAt: s.startedAt,
  });
}

export function updateActivity(id: string, patch: Partial<IdracActivityRow>) {
  const i = rows.findIndex((r) => r.id === id);
  if (i >= 0) rows[i] = { ...rows[i], ...patch };
}

