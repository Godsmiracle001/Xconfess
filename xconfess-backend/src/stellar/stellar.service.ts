import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import StellarSdk from "stellar-sdk";

@Injectable()
export class StellarService {
  private server: StellarSdk.Horizon.Server;
  private contractId: string;
  private network: string;
  private horizonUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.horizonUrl =
      this.configService.get<string>("STELLAR_HORIZON_URL") ??
      "https://horizon-testnet.stellar.org";

    this.contractId =
      this.configService.get<string>("STELLAR_CONTRACT_ID") ?? "";

    this.network =
      this.configService.get<string>("STELLAR_NETWORK") ?? "testnet";

    this.server = new StellarSdk.Horizon.Server(this.horizonUrl);
  }

  async getTransaction(txHash: string) {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      const ops = await this.server
        .operations()
        .forTransaction(txHash)
        .call();

      return { ...tx, operations: ops.records };
    } catch {
      return null;
    }
  }

  /**
   * Example helper from main branch
   */
  buildAnchoredResponse(
    txHash: string,
    confessionContent: string,
    timestamp: string
  ) {
    const stellarHash = this.hashConfession(confessionContent, timestamp);

    return {
      stellarTxHash: txHash,
      stellarHash,
      anchoredAt: new Date(),
    };
  }

  /**
   * Get contract configuration info
   */
  getContractInfo(): {
    contractId: string;
    network: string;
    horizonUrl: string;
  } {
    return {
      contractId: this.contractId,
      network: this.network,
      horizonUrl: this.horizonUrl,
    };
  }

  private hashConfession(content: string, timestamp: string): string {
    // TODO: implement or keep existing logic
    return `${content}-${timestamp}`;
  }
}