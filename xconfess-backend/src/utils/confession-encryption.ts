import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt plain text using AES-256-CBC.
 *
 * @param text - The plain text to encrypt.
 * @param key  - A 32-character AES-256 key (callers should source this from ConfigService).
 * @returns    - Hex-encoded IV + ':' + encrypted cipher text.
 */
export function encryptConfession(text: string, key: string): string {
  if (!key || key.length !== 32) {
    throw new Error('Invalid AES key: must be exactly 32 characters (AES-256).');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt cipher text that was produced by {@link encryptConfession}.
 *
 * @param encryptedText - The `iv:cipherText` string returned by `encryptConfession`.
 * @param key           - The same 32-character AES-256 key used for encryption.
 * @returns             - The original plain text.
 */
export function decryptConfession(encryptedText: string, key: string): string {
  if (!key || key.length !== 32) {
    throw new Error('Invalid AES key: must be exactly 32 characters (AES-256).');
  }
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
