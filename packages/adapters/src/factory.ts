/**
 * factory.ts — Adapter factory and auto-detection.
 * Returns the correct adapter based on detected iDRAC generation.
 */
import type { IdracAdapter, IdracGeneration } from '@idrac/shared';
import { RedfishAdapter } from './redfish-adapter';
import { LegacyJavaAdapter } from './legacy-java-adapter';
import { LegacyCgiAdapter } from './legacy-cgi-adapter';
import { createHttpClient } from './http-client';

interface Credentials { ip: string; username: string; password: string; }

export function getAdapter(generation: IdracGeneration, creds: Credentials): IdracAdapter {
  switch (generation) {
    case '9': case '8': return new RedfishAdapter(creds.ip, creds.username, creds.password, generation);
    case '7': return new LegacyJavaAdapter(creds.ip, creds.username, creds.password);
    case '6': return new LegacyCgiAdapter(creds.ip, creds.username, creds.password);
    default: throw new Error(`Unsupported iDRAC generation: ${generation}`);
  }
}

export async function probeGeneration(ip: string, username: string, password: string): Promise<IdracGeneration> {
  const http = createHttpClient(ip, 4000);
  try {
    const res = await http.get('/redfish/v1/', { timeout: 4000, auth: { username, password } });
    if (res.status === 200) {
      const version = res.data?.RedfishVersion ?? '';
      return version >= '1.6' ? '9' : '8';
    }
  } catch { /* not redfish */ }
  try {
    const res = await http.get('/data?get=version', { timeout: 3000, auth: { username, password } });
    if (res.status === 200) return '7';
  } catch { /* not iDRAC 7 */ }
  try {
    const res = await http.get('/cgi-bin/webcgi/login', { timeout: 3000 });
    if (res.status === 200) return '6';
  } catch { /* not iDRAC 6 */ }
  throw new Error(`Unable to detect iDRAC generation at ${ip}. Ensure the iDRAC is reachable and credentials are correct.`);
}
