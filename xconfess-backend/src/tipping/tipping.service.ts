import { Injectable, BadRequestException } from "@nestjs/common";
import { StellarService } from "../stellar/stellar.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TippingService {
  constructor(
    private readonly stellarService: StellarService,
    private readonly configService: ConfigService
  ) {}

  async verifyTip(txHash: string, expectedAmount: string): Promise<boolean> {
    const tipRecipient = this.configService.get<string>("TIP_RECIPIENT_ADDRESS");

    if (!tipRecipient) {
      throw new BadRequestException("Tip recipient address is not configured.");
    }

    const tx = await this.stellarService.getTransaction(txHash);

    if (!tx) {
      throw new BadRequestException("Transaction not found on chain.");
    }

    // Find payment operations that match the tip flow exactly
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
        "No valid payment to the tip recipient found in this transaction."
      );
    }

    if (matchingPayments.length > 1) {
      throw new BadRequestException(
        "Ambiguous transaction: multiple matching payment operations found."
      );
    }

    return true;
  }
}