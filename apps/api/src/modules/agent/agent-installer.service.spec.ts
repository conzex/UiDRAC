import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { buildAgentInstallerZip } from './agent-installer.service';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe('buildAgentInstallerZip', () => {
  it('builds a non-empty zip with credentials.json', async () => {
    const creds = JSON.stringify({ schema: 'uidrac-edge-agent/v1', agentId: 'test', agentSecret: 'secret' });
    const { filename, stream } = await buildAgentInstallerZip('linux', creds, 'acme-corp');
    expect(filename).toContain('acme-corp');
    const buf = await streamToBuffer(stream);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});
