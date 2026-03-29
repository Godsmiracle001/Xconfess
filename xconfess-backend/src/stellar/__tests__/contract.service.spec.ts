// src/stellar/__tests__/contract.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ContractService } from '../contract.service';
import { StellarConfigService } from '../stellar-config.service';
import { TransactionBuilderService } from '../transaction-builder.service';
import {
  StellarTimeoutError,
  StellarMalformedTransactionError,
} from '../utils/stellar-error.handler';
import { InvokeContractDto } from '../dto/invoke-contract.dto';

describe('ContractService', () => {
  let service: ContractService;
  let module: TestingModule;
  let txBuilderService: TransactionBuilderService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
      ],
      providers: [
        ContractService,
        StellarConfigService,
        TransactionBuilderService,
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
    txBuilderService = module.get(TransactionBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('invocationFromAllowlistedDto', () => {
    it('maps anchor_confession to configured contract and typed args', () => {
      const stellarConfig = module.get(StellarConfigService);
      jest.spyOn(stellarConfig, 'getContractId').mockReturnValue('CC_TEST');

      const dto = {
        operation: 'anchor_confession' as const,
        confessionHash: 'ab'.repeat(32),
        timestamp: 99,
        sourceAccount: 'G_SIGNER',
      } satisfies InvokeContractDto;

      const inv = service.invocationFromAllowlistedDto(dto, 'G_SIGNER');

      expect(inv).toEqual({
        contractId: 'CC_TEST',
        functionName: 'anchor_confession',
        args: [
          { type: 'bytes', value: Buffer.from(dto.confessionHash, 'hex') },
          { type: 'u64', value: 99 },
        ],
        sourceAccount: 'G_SIGNER',
      });
    });
  });

  describe('Negative Paths & Error Handling', () => {
    it('should throw StellarTimeoutError when transaction times out', async () => {
      jest
        .spyOn(txBuilderService, 'buildTransaction')
        .mockResolvedValue({} as any);
      jest.spyOn(txBuilderService, 'signTransaction').mockReturnValue({} as any);
      jest
        .spyOn(txBuilderService, 'submitTransaction')
        .mockRejectedValue(new Error('Transaction timeout'));

      await expect(
        service.invokeContract(
          {
            contractId:
              'CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR',
            functionName: 'test',
            args: [],
            sourceAccount: 'GACRG7PJ62DGGUXXVA3XVTAAZGMFMHEIYNN7MUT56LBXC4WW6KKDOPM2',
          },
          'SCS5KNRWMGTYHLXX6QHBCLIGGSERWUOO3N5EF4EPW5OO23S6MW3NHJID',
        ),
      ).rejects.toThrow(StellarTimeoutError);
    });

    it('should throw StellarMalformedTransactionError on tx_bad_seq', async () => {
      jest
        .spyOn(txBuilderService, 'buildTransaction')
        .mockResolvedValue({} as any);
      jest.spyOn(txBuilderService, 'signTransaction').mockReturnValue({} as any);

      const badSeqError = {
        response: {
          data: {
            extras: {
              result_codes: { transaction: 'tx_bad_seq' },
            },
          },
        },
      };

      jest
        .spyOn(txBuilderService, 'submitTransaction')
        .mockRejectedValue(badSeqError);

      await expect(
        service.invokeContract(
          {
            contractId:
              'CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR',
            functionName: 'test',
            args: [],
            sourceAccount: 'GACRG7PJ62DGGUXXVA3XVTAAZGMFMHEIYNN7MUT56LBXC4WW6KKDOPM2',
          },
          'SCS5KNRWMGTYHLXX6QHBCLIGGSERWUOO3N5EF4EPW5OO23S6MW3NHJID',
        ),
      ).rejects.toThrow(StellarMalformedTransactionError);
    });
  });
});
