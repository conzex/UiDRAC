/**
 * encryption.ts — AES-256-GCM encrypt/decrypt for iDRAC credentials at rest.
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encrypt(
  plaintext: string,
  masterKeyHex: string,
): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const key = Buffer.from(masterKeyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: encrypted, iv, tag };
}

export function decrypt(
  ciphertext: Buffer,
  iv: Buffer,
  tag: Buffer,
  masterKeyHex: string,
): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
