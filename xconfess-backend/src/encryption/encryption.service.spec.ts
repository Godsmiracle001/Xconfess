import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  };

  beforeEach(async () => {
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
});
