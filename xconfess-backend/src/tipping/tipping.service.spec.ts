import { Test, TestingModule } from "@nestjs/testing";
import { TippingService } from "./tipping.service";
import { StellarService } from "../stellar/stellar.service";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";

const RECIPIENT = "GCORRECTRECIPIENTADDRESS";
const AMOUNT = "10";

const mockStellarService = { getTransaction: jest.fn() };
const mockConfigService = { get: jest.fn().mockReturnValue(RECIPIENT) };

const makeOp = (to: string, amount: string, asset_type = "native") => ({
  type: "payment",
  asset_type,
  to,
  amount,
});

describe("TippingService", () => {
  let service: TippingService;

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
    mockConfigService.get.mockReturnValue(RECIPIENT);
  });

  it("accepts a valid tip to the correct recipient", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [makeOp(RECIPIENT, "10")],
    });
    await expect(service.verifyTip("txhash", AMOUNT)).resolves.toBe(true);
  });

  it("rejects a payment to the wrong destination", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [makeOp("GWRONGADDRESS", "10")],
    });
    await expect(service.verifyTip("txhash", AMOUNT)).rejects.toThrow(
      BadRequestException
    );
  });

  it("rejects a non-native asset payment", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [makeOp(RECIPIENT, "10", "credit_alphanum4")],
    });
    await expect(service.verifyTip("txhash", AMOUNT)).rejects.toThrow(
      BadRequestException
    );
  });

  it("rejects an unrelated valid XLM payment", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [makeOp("GSOMEONEELSE", "100")],
    });
    await expect(service.verifyTip("txhash", AMOUNT)).rejects.toThrow(
      BadRequestException
    );
  });

  it("rejects ambiguous multi-operation transactions", async () => {
    mockStellarService.getTransaction.mockResolvedValue({
      operations: [
        makeOp(RECIPIENT, "10"),
        makeOp(RECIPIENT, "10"),
      ],
    });
    await expect(service.verifyTip("txhash", AMOUNT)).rejects.toThrow(
      BadRequestException
    );
  });

  it("rejects when transaction is not found", async () => {
    mockStellarService.getTransaction.mockResolvedValue(null);
    await expect(service.verifyTip("txhash", AMOUNT)).rejects.toThrow(
      BadRequestException
    );
  });
});