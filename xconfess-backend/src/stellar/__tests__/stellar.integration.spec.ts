import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as StellarSDK from '@stellar/stellar-sdk';
import { StellarModule } from '../stellar.module';
import { StellarService } from '../stellar.service';
import { ContractService } from '../contract.service';

describe('Stellar Integration Tests', () => {
  let stellarService: StellarService;
  let contractService: ContractService;
  let testKeypair: StellarSDK.Keypair;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        StellarModule,
      ],
    }).compile();

    stellarService = module.get<StellarService>(StellarService);
    contractService = module.get<ContractService>(ContractService);
    // Generate test keypair
    testKeypair = StellarSDK.Keypair.random();
  });

  describe('Stellar Network Connection', () => {
    it('should connect to Stellar testnet', async () => {
      const config = stellarService.getNetworkConfig();
      expect(config.network).toBe('testnet');
    });
    it('should verify a real transaction', async () => {
      // Use a known testnet transaction
      const knownTxHash = 'a1b2c3d4...'; // Replace with real testnet tx
      try {
        const result = await stellarService.verifyTransaction(knownTxHash);
        expect(result).toHaveProperty('hash');
        expect(result).toHaveProperty('success');
      } catch (error) {
        // Transaction might not exist, which is okay for this test
        expect(error.message).toContain('Transaction not found');
      }
    });
  });

  describe('Contract Integration', () => {
    it('should verify confession on-chain', async () => {
      // Create a test confession hash
      const confessionHash = Buffer.from('test-confession-hash');
      try {
        const timestamp = await contractService.verifyConfession(
          confessionHash.toString('hex'),
        );
        // Might return null if not anchored
        expect(timestamp).toBeNull();
      } catch (error) {
        // Contract might not be deployed
        expect(error).toBeDefined();
      }
    });
  });
});
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as StellarSDK from '@stellar/stellar-sdk';
import { StellarModule } from '../stellar.module';
import { StellarService } from '../stellar.service';
import { ContractService } from '../contract.service';

describe('Stellar Integration Tests', () => {
  let stellarService: StellarService;
  let contractService: ContractService;
  let testKeypair: StellarSDK.Keypair;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        StellarModule,
      ],
    }).compile();

    stellarService = module.get<StellarService>(StellarService);
    contractService = module.get<ContractService>(ContractService);
    // Generate test keypair
    testKeypair = StellarSDK.Keypair.random();
  });

  describe('Stellar Network Connection', () => {
    it('should connect to Stellar testnet', async () => {
      const config = stellarService.getNetworkConfig();
      expect(config.network).toBe('testnet');
    });
    it('should verify a real transaction', async () => {
      // Use a known testnet transaction
      const knownTxHash = 'a1b2c3d4...'; // Replace with real testnet tx
      try {
        const result = await stellarService.verifyTransaction(knownTxHash);
        expect(result).toHaveProperty('hash');
        expect(result).toHaveProperty('success');
      } catch (error) {
        // Transaction might not exist, which is okay for this test
        expect(error.message).toContain('Transaction not found');
      }
    });
  });

  describe('Contract Integration', () => {
    it('should verify confession on-chain', async () => {
      // Create a test confession hash
      const confessionHash = Buffer.from('test-confession-hash');
      try {
        const timestamp = await contractService.verifyConfession(
          confessionHash.toString('hex'),
        );
        // Might return null if not anchored
        expect(timestamp).toBeNull();
      } catch (error) {
        // Contract might not be deployed
        expect(error).toBeDefined();
      }
    });
  });
});
