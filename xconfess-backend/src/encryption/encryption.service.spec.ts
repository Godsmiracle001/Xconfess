import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const validEncryptionKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue(validEncryptionKey);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt text correctly', () => {
    const text = 'sensitive@email.com';
    const encrypted = service.encrypt(text);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it('should return empty string for empty input', () => {
    expect(service.encrypt('')).toBe('');
    expect(service.decrypt('')).toBe('');
  });

  it('should produce different ciphertexts for same input', () => {
    const text = 'test@example.com';
    const encrypted1 = service.encrypt(text);
    const encrypted2 = service.encrypt(text);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should encrypt specified fields in object', () => {
    const obj = { email: 'test@example.com', name: 'John' };
    const encrypted = service.encryptFields(obj, ['email']);

    expect(encrypted.email).not.toBe(obj.email);
    expect(encrypted.name).toBe(obj.name);
  });

  it('should decrypt specified fields in object', () => {
    const email = 'test@example.com';
    const encrypted = service.encrypt(email);
    const obj = { email: encrypted, name: 'John' };
    const decrypted = service.decryptFields(obj, ['email']);

    expect(decrypted.email).toBe(email);
    expect(decrypted.name).toBe(obj.name);
  });

  it('should throw error for invalid encrypted format', () => {
    expect(() => service.decrypt('invalid-format')).toThrow();
  });

  it('should reject ciphertext values with invalid payload shape', () => {
    const invalidCiphertexts = [
      'deadbeef',
      'deadbeef:',
      ':deadbeef:cafebabe',
      'deadbeef:feedface:',
      'deadbeef:feedface:cafebabe:extra',
    ];

    for (const ciphertext of invalidCiphertexts) {
      expect(() => service.decrypt(ciphertext)).toThrow(
        'Invalid encrypted data format',
      );
    }
  });

  it('should throw for malformed ciphertext parts with valid shape', () => {
    const malformedCiphertexts = [
      'not-hex:abcdef0123456789abcdef01234567:cafebabe',
      '0011:invalid-tag:cafebabe',
      '00112233445566778899aabbccddeeff:00112233445566778899aabbccddeeff:zz',
    ];

    for (const ciphertext of malformedCiphertexts) {
      expect(() => service.decrypt(ciphertext)).toThrow();
    }
  });

  it('should enforce ENCRYPTION_KEY presence at construction time', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(
      Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile(),
    ).rejects.toThrow(
      'CONFESSION_ENCRYPTION_KEY must be set in environment variables',
    );
  });

  it('should enforce ENCRYPTION_KEY size at construction time', async () => {
    mockConfigService.get.mockReturnValue('001122');

    await expect(
      Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile(),
    ).rejects.toThrow(
      'CONFESSION_ENCRYPTION_KEY must be 32 bytes (64 hex characters)',
    );
  });
});
