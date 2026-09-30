/** In-memory tab data for the current browser session — avoids refetch on tab switches. */
const store = new Map<string, unknown>();

export function getSessionSummary<T>(url: string): T | null {
  return (store.get(url) as T) ?? null;
}

export function setSessionSummary(url: string, data: unknown) {
  store.set(url, data);
}

export function clearSessionSummaryForServer(serverId: string) {
  for (const key of store.keys()) {
    if (key.includes(`/servers/${serverId}/summary/`)) store.delete(key);
  }
}
