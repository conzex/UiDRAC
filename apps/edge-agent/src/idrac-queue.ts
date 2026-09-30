/** Serialize LAN work per iDRAC IP — one session at a time, with timeout and queue cap. */
const chains = new Map<string, Promise<void>>();
const pending = new Map<string, number>();

const DEFAULT_TIMEOUT_MS = 75_000;
const MAX_PENDING_PER_IP = 4;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function resetIdracQueue(ip: string) {
  const key = ip.trim() || '_';
  chains.delete(key);
  pending.set(key, 0);
}

export function enqueueIdracOp<T>(ip: string, fn: () => Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const key = ip.trim() || '_';
  const waiting = pending.get(key) ?? 0;
  if (waiting >= MAX_PENDING_PER_IP) {
    return Promise.reject(
      new Error('iDRAC queue is busy for this host — wait for pending work to finish or retry in a few seconds'),
    );
  }
  pending.set(key, waiting + 1);

  const prev = chains.get(key) ?? Promise.resolve();
  const run = prev
    .then(() => withTimeout(fn(), timeoutMs, 'iDRAC operation'))
    .catch((err) => {
      resetIdracQueue(key);
      throw err;
    })
    .finally(() => {
      const n = (pending.get(key) ?? 1) - 1;
      pending.set(key, Math.max(0, n));
    });

  chains.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}
