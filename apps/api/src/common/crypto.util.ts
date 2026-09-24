/** AES-256-GCM helpers for tenant-scoped secrets at rest. */
import * as crypto from 'crypto';

const KEY_HEX = process.env.MASTER_ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function masterKey(): Buffer {
  return Buffer.from(KEY_HEX, 'hex');
}

export function encryptSecret(plaintext: string): { encrypted: Buffer; iv: Buffer; tag: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted, iv, tag };
}

export function decryptSecret(encrypted: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function randomAgentSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function enrollmentSignature(tenantId: string, publicId: string): string {
  const secret = process.env.AGENT_SIGNING_SECRET ?? process.env.JWT_SECRET ?? 'dev-agent-signing';
  return crypto.createHmac('sha256', secret).update(`${tenantId}:${publicId}`).digest('hex');
}
