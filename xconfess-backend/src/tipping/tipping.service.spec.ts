import { TippingService } from './tipping.service';
import { Tip, TipVerificationStatus } from './entities/tip.entity';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('TippingService', () => {
  let service: TippingService;
  let mockTipRepo: any;
  let mockConfessionRepo: any;
  let mockStellarService: any;

  beforeEach(() => {
    mockTipRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'tip-123' })),
      save: jest.fn((tip) =>
        Promise.resolve({ ...tip, id: tip.id || 'tip-123' }),
      ),
    };

    mockConfessionRepo = {
      findOne: jest.fn(),
    };

    mockStellarService = {
      verifyTransaction: jest.fn(),
      getHorizonTxUrl: jest
        .fn()
        .mockReturnValue('https://horizon/testnet/txs/tx123'),
    };

    service = new TippingService(
      mockTipRepo,
      mockConfessionRepo,
      mockStellarService,
    );
  });

  describe('verifyAndRecordTip', () => {
    const mockDto = { txId: 'tx123' };
    const confessionId = 'confession-123';

    it('should create a new tip for valid transaction', async () => {
      mockConfessionRepo.findOne.mockResolvedValue({ id: confessionId });
      mockTipRepo.findOne.mockResolvedValue(null);
      mockStellarService.verifyTransaction.mockResolvedValue(true);

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            _embedded: {
              operations: [
                {
                  type: 'payment',
                  asset_type: 'native',
                  amount: '1.0',
                  from: 'GABC123',
                },
              ],
            },
          }),
      });
      global.fetch = mockFetch;

      const result = await service.verifyAndRecordTip(confessionId, mockDto);

      expect(result.isNew).toBe(true);
      expect(result.isIdempotent).toBe(false);
      expect(result.tip.txId).toBe('tx123');
      expect(mockTipRepo.save).toHaveBeenCalled();
    });

    it('should return existing tip for duplicate request (idempotent)', async () => {
      const existingTip = {
        id: 'existing-tip',
        txId: 'tx123',
        confessionId,
        amount: 1.0,
        verificationStatus: TipVerificationStatus.VERIFIED,
      };

      mockConfessionRepo.findOne.mockResolvedValue({ id: confessionId });
      mockTipRepo.findOne.mockResolvedValue(existingTip);

      const result = await service.verifyAndRecordTip(confessionId, mockDto);

      expect(result.isNew).toBe(false);
      expect(result.isIdempotent).toBe(true);
      expect(result.tip.id).toBe('existing-tip');
      expect(mockStellarService.verifyTransaction).not.toHaveBeenCalled();
    });

    it('should reject conflicting payload (same txId, different confession)', async () => {
      const existingTip = {
        id: 'existing-tip',
        txId: 'tx123',
        confessionId: 'different-confession',
        amount: 1.0,
        verificationStatus: TipVerificationStatus.VERIFIED,
      };

      mockConfessionRepo.findOne.mockResolvedValue({ id: confessionId });
      mockTipRepo.findOne.mockResolvedValue(existingTip);

      await expect(
        service.verifyAndRecordTip(confessionId, mockDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent confession', async () => {
      mockConfessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyAndRecordTip(confessionId, mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid transaction', async () => {
      mockConfessionRepo.findOne.mockResolvedValue({ id: confessionId });
      mockTipRepo.findOne.mockResolvedValue(null);
      mockStellarService.verifyTransaction.mockResolvedValue(false);

      await expect(
        service.verifyAndRecordTip(confessionId, mockDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transaction below minimum amount', async () => {
      mockConfessionRepo.findOne.mockResolvedValue({ id: confessionId });
      mockTipRepo.findOne.mockResolvedValue(null);
      mockStellarService.verifyTransaction.mockResolvedValue(true);

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            _embedded: {
              operations: [
                {
                  type: 'payment',
                  asset_type: 'native',
                  amount: '0.01', // Below minimum
                  from: 'GABC123',
                },
              ],
            },
          }),
      });
      global.fetch = mockFetch;

      await expect(
        service.verifyAndRecordTip(confessionId, mockDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transaction without XLM payment', async () => {
      mockConfessionRepo.findOne.mockResolvedValue({ id: confessionId });
      mockTipRepo.findOne.mockResolvedValue(null);
      mockStellarService.verifyTransaction.mockResolvedValue(true);

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            _embedded: {
              operations: [], // No payment operations
            },
          }),
      });
      global.fetch = mockFetch;

      await expect(
        service.verifyAndRecordTip(confessionId, mockDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTipStats', () => {
    it('should calculate correct stats', async () => {
      const tips = [
        { id: '1', amount: 1.0 },
        { id: '2', amount: 2.0 },
        { id: '3', amount: 3.0 },
      ];
      mockTipRepo.find.mockResolvedValue(tips);

      const stats = await service.getTipStats('confession-123');

      expect(stats.totalAmount).toBe(6.0);
      expect(stats.totalCount).toBe(3);
      expect(stats.averageAmount).toBe(2.0);
    });

    it('should handle empty tips', async () => {
      mockTipRepo.find.mockResolvedValue([]);

      const stats = await service.getTipStats('confession-123');

      expect(stats.totalAmount).toBe(0);
      expect(stats.totalCount).toBe(0);
      expect(stats.averageAmount).toBe(0);
    });
  });
});
