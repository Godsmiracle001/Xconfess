import { encryptConfession, decryptConfession } from './confession-encryption';

describe('Confession AES Encryption', () => {
  const key = '12345678901234567890123456789012'; // 32 chars

  it('should encrypt and decrypt confession text correctly', () => {
    const text = 'This is a secret confession.';
    const encrypted = encryptConfession(text, key);
    const decrypted = decryptConfession(encrypted, key);
    expect(decrypted).toBe(text);
  });

  it('should produce different ciphertexts for same text (random IV)', () => {
    const text = 'Same confession';
    const encrypted1 = encryptConfession(text, key);
    const encrypted2 = encryptConfession(text, key);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptConfession(encrypted1, key)).toBe(text);
    expect(decryptConfession(encrypted2, key)).toBe(text);
  });

  it('should throw error for invalid key length', () => {
    expect(() => encryptConfession('test', 'shortkey')).toThrow();
    expect(() => decryptConfession('invalid', 'shortkey')).toThrow();
  });

  it('should throw error when key is empty', () => {
    expect(() => encryptConfession('test', '')).toThrow();
    expect(() => decryptConfession('invalid', '')).toThrow();
  });
});
