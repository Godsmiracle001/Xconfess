import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tip, TipVerificationStatus } from "./entities/tip.entity";
import { AnonymousConfession } from "../confession/entities/confession.entity";
import { StellarService } from "../stellar/stellar.service";
import { VerifyTipDto } from "./dto/verify-tip.dto";
import { ConfigService } from "@nestjs/config";

export interface TipStats {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
}

export interface TipVerificationResult {
  tip: Tip;
  isNew: boolean;
  isIdempotent: boolean;
}

@Injectable()
export class TippingService {
  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,

    @InjectRepository(AnonymousConfession)
    private readonly confessionRepository: Repository<AnonymousConfession>,

    private readonly stellarService: StellarService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 🔹 Your validation logic (kept!)
   */
  async verifyTip(txHash: string, expectedAmount: string): Promise<boolean> {
    const tipRecipient = this.configService.get<string>(
      "TIP_RECIPIENT_ADDRESS"
    );

    if (!tipRecipient) {
      throw new BadRequestException(
        "Tip recipient address is not configured."
      );
    }

    const tx = await this.stellarService.getTransaction(txHash);

    if (!tx) {
      throw new BadRequestException("Transaction not found on chain.");
    }

    const matchingPayments = tx.operations.filter((op: any) => {
      return (
        op.type === "payment" &&
        op.asset_type === "native" &&
        op.to === tipRecipient &&
        parseFloat(op.amount) >= parseFloat(expectedAmount)
      );
    });

    if (matchingPayments.length === 0) {
      throw new BadRequestException(
        "No valid payment to the tip recipient found."
      );
    }

    if (matchingPayments.length > 1) {
      throw new BadRequestException(
        "Ambiguous transaction: multiple matching payments."
      );
    }

    return true;
  }

  /**
   * 🔹 Main business logic (now REUSES verifyTip)
   */
  async verifyAndRecordTip(
    confessionId: string,
    dto: VerifyTipDto
  ): Promise<TipVerificationResult> {
    const confession = await this.confessionRepository.findOne({
      where: { id: confessionId },
    });

    if (!confession) {
      throw new NotFoundException("Confession not found");
    }

    const existingTip = await this.tipRepository.findOne({
      where: { txId: dto.txId },
    });

    if (existingTip) {
      if (existingTip.confessionId !== confessionId) {
        throw new ConflictException("Transaction already used elsewhere");
      }

      return {
        tip: existingTip,
        isNew: false,
        isIdempotent: true,
      };
    }

    // ✅ Reuse your validation here
    await this.verifyTip(dto.txId, "0.1");

    const tip = this.tipRepository.create({
      confessionId,
      txId: dto.txId,
      verificationStatus: TipVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    });

    const savedTip = await this.tipRepository.save(tip);

    return {
      tip: savedTip,
      isNew: true,
      isIdempotent: false,
    };
  }

  /**
   * Stats (from main)
   */
  async getTipStats(confessionId: string): Promise<TipStats> {
    const tips = await this.tipRepository.find({
      where: { confessionId },
    });

    const totalAmount = tips.reduce(
      (sum, tip) => sum + Number(tip.amount),
      0
    );

    const totalCount = tips.length;
    const averageAmount =
      totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      totalAmount,
      totalCount,
      averageAmount,
    };
  }
}