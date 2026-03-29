import { Test, TestingModule } from "@nestjs/testing";
import { TippingService } from "./tipping.service";
import { StellarService } from "../stellar/stellar.service";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { TipVerificationStatus } from "./entities/tip.entity";

const RECIPIENT = "GCORRECTRECIPIENTADDRESS";
const AMOUNT = "10";

const makeOp = (to: string, amount: string, asset_type = "native") => ({
  type: "payment",
  asset_type,
  to,
  amount,
});

describe("TippingService - verifyTip (validation layer)", () => {
  let service: TippingService;

  const mockStellarService = { getTransaction: jest.fn() };
  const mockConfigService = { get: jest.fn().mockReturnValue(RECIPIENT) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TippingService,
        { provide: StellarService, useValue: mockStellarService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TippingService>(TippingService);
    jest.clearAllMocks();
  });

  it("accepts a valid tip", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [makeOp(RECIPIENT, "10")],
    });

    await expect(service.verifyTip("txhash", AMOUNT)).resolves.toBe(true);
  });

  it("rejects wrong destination", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [makeOp("WRONG", "10")],
    });

    await expect(service.verifyTip("txhash", AMOUNT)).rejects.toThrow(
      BadRequestException
    );
  });
});

describe("TippingService - business logic (main)", () => {
  let service: TippingService;
  let mockTipRepo: any;
  let mockConfessionRepo: any;
  let mockStellarService: any;

  beforeEach(() => {
    mockTipRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: "tip-123" })),
      save: jest.fn((tip) =>
        Promise.resolve({ ...tip, id: tip.id || "tip-123" })
      ),
    };

    mockConfessionRepo = {
      findOne: jest.fn(),
    };

    mockStellarService = {
      verifyTransaction: jest.fn(),
      getHorizonTxUrl: jest
        .fn()
        .mockReturnValue("https://horizon/testnet/txs/tx123"),
    };

    service = new TippingService(
      mockTipRepo,
      mockConfessionRepo,
      mockStellarService
    );
  });

  it("creates a new tip", async () => {
    mockConfessionRepo.findOne.mockResolvedValue({ id: "confession-123" });
    mockTipRepo.findOne.mockResolvedValue(null);
    mockStellarService.verifyTransaction.mockResolvedValue(true);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          operations: [
            {
              type: "payment",
              asset_type: "native",
              amount: "1.0",
            },
          ],
        },
      }),
    });

    const result = await service.verifyAndRecordTip("confession-123", {
      txId: "tx123",
    });

    expect(result.isNew).toBe(true);
  });

  it("rejects invalid tx", async () => {
    mockConfessionRepo.findOne.mockResolvedValue({ id: "confession-123" });
    mockTipRepo.findOne.mockResolvedValue(null);
    mockStellarService.verifyTransaction.mockResolvedValue(false);

    await expect(
      service.verifyAndRecordTip("confession-123", { txId: "tx123" })
    ).rejects.toThrow(BadRequestException);
  });
});