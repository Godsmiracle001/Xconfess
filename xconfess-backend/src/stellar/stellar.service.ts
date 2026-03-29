import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import StellarSdk from "stellar-sdk";

@Injectable()
export class StellarService {
  private server: StellarSdk.Horizon.Server;

  constructor(private readonly configService: ConfigService) {
    const horizonUrl =
      this.configService.get<string>("STELLAR_HORIZON_URL") ??
      "https://horizon-testnet.stellar.org";
    this.server = new StellarSdk.Horizon.Server(horizonUrl);
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
}