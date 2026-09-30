/** One iDRAC sync at a time per server — prevents tab storms from stacking agent work. */
const chains = new Map<string, Promise<void>>();

export function withIdracServerLock<T>(serverId: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(serverId) ?? Promise.resolve();
  const run = prev.then(() => fn());
  chains.set(
    serverId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}
