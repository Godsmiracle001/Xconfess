import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from '../contract.service';
import { StellarConfigService } from '../stellar-config.service';
import { TransactionBuilderService } from '../transaction-builder.service';

describe('ContractService', () => {
  let service: ContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        StellarConfigService,
        TransactionBuilderService,
      ],
    }).compile();
    service = module.get<ContractService>(ContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encodeContractArgs', () => {
    it('should return args as-is (buggy, to be fixed)', () => {
      const args = ['foo', 123, true];
      // This is intentionally buggy for commit 17
      // Should just return the same array
      expect(service['encodeContractArgs'](args)).toEqual(args);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from '../contract.service';
import { StellarConfigService } from '../stellar-config.service';
import { TransactionBuilderService } from '../transaction-builder.service';

describe('ContractService', () => {
  let service: ContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        StellarConfigService,
        TransactionBuilderService,
      ],
    }).compile();
    service = module.get<ContractService>(ContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encodeContractArgs', () => {
    it('should return args as-is (buggy, to be fixed)', () => {
      const args = ['foo', 123, true];
      // This is intentionally buggy for commit 17
      // Should just return the same array
      expect(service['encodeContractArgs'](args)).toEqual(args);
    });
  });
});
