/** Run API calls one after another (reduces iDRAC session pressure via the agent). */
import type { AxiosResponse } from 'axios';

export async function getSequential<T = unknown>(
  fetch: (path: string) => Promise<AxiosResponse<T>>,
  paths: string[],
): Promise<PromiseSettledResult<AxiosResponse<T>>[]> {
  const results: PromiseSettledResult<AxiosResponse<T>>[] = [];
  for (const path of paths) {
    try {
      const value = await fetch(path);
      results.push({ status: 'fulfilled', value });
    } catch (reason) {
      results.push({ status: 'rejected', reason });
    }
  }
  return results;
}
