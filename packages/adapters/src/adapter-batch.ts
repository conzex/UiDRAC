import type { IdracAdapter } from '@idrac/shared';

export type AdapterBatchCall = { key: string; method: string; args?: unknown[] };

export type AdapterBatchResult = Record<string, unknown> & {
  _errors?: Record<string, string>;
};

export async function runAdapterBatch(
  adapter: IdracAdapter,
  calls: AdapterBatchCall[],
  parallel = false,
  tolerant = true,
): Promise<AdapterBatchResult> {
  const exec = async (call: AdapterBatchCall): Promise<[string, unknown | null, string | null]> => {
    try {
      const target = (adapter as unknown as Record<string, unknown>)[call.method];
      if (typeof target !== 'function') {
        throw new Error(`Unknown adapter method: ${call.method}`);
      }
      const value = await (target as (...a: unknown[]) => Promise<unknown>).apply(adapter, call.args ?? []);
      return [call.key, value, null];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!tolerant) throw err;
      return [call.key, null, msg];
    }
  };

  const out: AdapterBatchResult = {};
  const errors: Record<string, string> = {};

  if (parallel) {
    const pairs = await Promise.all(calls.map(exec));
    for (const [key, value, err] of pairs) {
      if (err) errors[key] = err;
      else if (value !== null) out[key] = value;
    }
  } else {
    for (const call of calls) {
      const [key, value, err] = await exec(call);
      if (err) errors[key] = err;
      else if (value !== null) out[key] = value;
    }
  }

  if (Object.keys(errors).length > 0) out._errors = errors;
  return out;
}
