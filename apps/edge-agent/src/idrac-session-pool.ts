/** Reuse Redfish sessions per iDRAC — avoids connect/disconnect churn (common cause of HTTP 503). */
import { getAdapter } from '@idrac/adapters';
import type { IdracAdapter, IdracGeneration } from '@idrac/shared';

const IDLE_MS = 45_000;
const CONNECT_TIMEOUT_MS = 25_000;

type Entry = {
  adapter: IdracAdapter;
  idleTimer: ReturnType<typeof setTimeout> | undefined;
};

const pool = new Map<string, Entry>();

function poolKey(generation: string, ip: string, username: string): string {
  return `${generation}|${ip}|${username}`;
}

function clearIdleTimer(entry: Entry) {
  if (entry.idleTimer !== undefined) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = undefined;
  }
}

function scheduleIdle(key: string, entry: Entry) {
  clearIdleTimer(entry);
  entry.idleTimer = setTimeout(() => {
    void entry.adapter.disconnect().catch(() => {});
    pool.delete(key);
  }, IDLE_MS);
}

function shouldReconnectSession(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /session|auth|unauthorized/i.test(msg);
}

export function evictPooledSession(generation: string, ip: string, username: string) {
  const key = poolKey(generation, ip, username);
  const entry = pool.get(key);
  if (!entry) return;
  clearIdleTimer(entry);
  void entry.adapter.disconnect().catch(() => {});
  pool.delete(key);
}

export async function withPooledIdracAdapter<T>(
  generation: IdracGeneration,
  creds: { ip: string; username: string; password: string },
  run: (adapter: IdracAdapter) => Promise<T>,
): Promise<T> {
  const key = poolKey(generation, creds.ip, creds.username);
  let entry = pool.get(key);
  if (!entry) {
    const adapter = getAdapter(generation, creds);
    await Promise.race([
      adapter.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('iDRAC connect timed out')), CONNECT_TIMEOUT_MS),
      ),
    ]);
    entry = { adapter, idleTimer: undefined };
    pool.set(key, entry);
  } else {
    clearIdleTimer(entry);
  }

  const invoke = () => run(entry!.adapter);

  try {
    return await invoke();
  } catch (err) {
    if (shouldReconnectSession(err)) {
      clearIdleTimer(entry);
      await entry.adapter.disconnect().catch(() => {});
      pool.delete(key);
      throw err;
    }
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 503 || status === 429) {
      await new Promise((r) => setTimeout(r, 900));
      try {
        return await invoke();
      } catch (retryErr) {
        throw retryErr;
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/timed out/i.test(msg)) {
      evictPooledSession(generation, creds.ip, creds.username);
    }
    throw err;
  } finally {
    const current = pool.get(key);
    if (current) scheduleIdle(key, current);
  }
}
