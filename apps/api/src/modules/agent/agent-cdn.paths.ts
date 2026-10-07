/** Canonical CDN publish folder at repository root (see cdn-agent/README.md). */
import { join } from 'path';

export const CDN_AGENT_DIR = 'cdn-agent';

export function cdnAgentFile(name: string): string {
  return join(process.cwd(), CDN_AGENT_DIR, name);
}
