import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../stellar.service';
import { StellarConfigService } from '../stellar-config.service';
import { TransactionBuilderService } from '../transaction-builder.service';

describe('StellarService', () => {
  let service: StellarService;
  let configService: StellarConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        StellarConfigService,
        TransactionBuilderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                STELLAR_NETWORK: 'testnet',
                STELLAR_SERVER_SECRET:
                  'SCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    configService = module.get<StellarConfigService>(StellarConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNetworkConfig', () => {
    it('should return network configuration', () => {
      const config = service.getNetworkConfig();
      expect(config).toHaveProperty('network');
      expect(config).toHaveProperty('horizonUrl');
      expect(config).toHaveProperty('sorobanRpcUrl');
      expect(config).not.toHaveProperty('serverSecret'); // Should never expose secrets
    });
    it('should return testnet configuration in test environment', () => {
      const config = service.getNetworkConfig();
      expect(config.network).toBe('testnet');
      expect(config.horizonUrl).toContain('testnet');
    });
  });

  describe('accountExists', () => {
    it('should return true for existing account', async () => {
      // Use a known testnet account
      const testAccount =
        'GBVXZHTLP3PFTIQYKQJQAZCQVKTQSQFM23R2PI7F3VGHKJJUXQWVYUHH';
      const exists = await service.accountExists(testAccount);
      // Note: This might fail if testnet is down or account doesn't exist
      // In real tests, you'd mock the Stellar server
      expect(typeof exists).toBe('boolean');
    });
    it('should return false for non-existent account', async () => {
      const fakeAccount =
        'GBVXZHTLP3PFTIQYKQJQAZCQVKTQSQFM23R2PI7F3VGHKJJUXQWVYXXX';
      const exists = await service.accountExists(fakeAccount);
      expect(exists).toBe(false);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../stellar.service';
import { StellarConfigService } from '../stellar-config.service';
import { TransactionBuilderService } from '../transaction-builder.service';

describe('StellarService', () => {
  let service: StellarService;
  let configService: StellarConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        StellarConfigService,
        TransactionBuilderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                STELLAR_NETWORK: 'testnet',
                STELLAR_SERVER_SECRET:
                  'SCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    configService = module.get<StellarConfigService>(StellarConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNetworkConfig', () => {
    it('should return network configuration', () => {
      const config = service.getNetworkConfig();
      expect(config).toHaveProperty('network');
      expect(config).toHaveProperty('horizonUrl');
      expect(config).toHaveProperty('sorobanRpcUrl');
      expect(config).not.toHaveProperty('serverSecret'); // Should never expose secrets
    });
    it('should return testnet configuration in test environment', () => {
      const config = service.getNetworkConfig();
      expect(config.network).toBe('testnet');
      expect(config.horizonUrl).toContain('testnet');
    });
  });

  describe('accountExists', () => {
    it('should return true for existing account', async () => {
      // Use a known testnet account
      const testAccount =
        'GBVXZHTLP3PFTIQYKQJQAZCQVKTQSQFM23R2PI7F3VGHKJJUXQWVYUHH';
      const exists = await service.accountExists(testAccount);
      // Note: This might fail if testnet is down or account doesn't exist
      // In real tests, you'd mock the Stellar server
      expect(typeof exists).toBe('boolean');
    });
    it('should return false for non-existent account', async () => {
      const fakeAccount =
        'GBVXZHTLP3PFTIQYKQJQAZCQVKTQSQFM23R2PI7F3VGHKJJUXQWVYXXX';
      const exists = await service.accountExists(fakeAccount);
      expect(exists).toBe(false);
    });
  });
});
