import { Injectable, Logger } from '@nestjs/common';
import * as StellarSDK from '@stellar/stellar-sdk';
import { StellarConfigService } from './stellar-config.service';
import { ITransactionOptions } from './interfaces/stellar-config.interface';

@Injectable()
export class TransactionBuilderService {
  private readonly logger = new Logger(TransactionBuilderService.name);

  constructor(private stellarConfig: StellarConfigService) {}

  /**
   * Build a Stellar transaction with operations
   */
  async buildTransaction(
    sourcePublicKey: string,
    operations: any[],
    options?: ITransactionOptions,
  ): Promise<any> {
    try {
      // Load source account
      const server = this.stellarConfig.getServer();
      const sourceAccount = await server.loadAccount(sourcePublicKey);

      // Create transaction builder
      const txBuilder = new StellarSDK.TransactionBuilder(sourceAccount, {
        fee: options?.fee || StellarSDK.BASE_FEE,
        networkPassphrase: this.stellarConfig.getNetwork(),
      });

      // Add operations
      operations.forEach((op) => txBuilder.addOperation(op));

      // Add memo if provided
      if (options?.memo) {
        txBuilder.addMemo(StellarSDK.Memo.text(options.memo));
      }

      // Set timebounds (required)
      if (options?.timebounds) {
        txBuilder.setTimeout(options.timebounds.maxTime);
      } else {
        txBuilder.setTimeout(300); // 5 minutes default
      }

      return txBuilder.build();
    } catch (error) {
      this.logger.error(`Failed to build transaction: ${error.message}`);
      throw new Error(`Transaction build failed: ${error.message}`);
    }
  }

  /**
   * Build a payment transaction
   */
  async buildPaymentTransaction(
    sourcePublicKey: string,
    destinationPublicKey: string,
    amount: string,
    asset: any = StellarSDK.Asset.native(),
    options?: ITransactionOptions,
  ): Promise<any> {
    const paymentOp = StellarSDK.Operation.payment({
      destination: destinationPublicKey,
      asset,
      amount,
    });

    return this.buildTransaction(sourcePublicKey, [paymentOp], options);
  }

  /**
   * Sign transaction with secret key
   */
  signTransaction(transaction: any, secretKey: string): any {
    try {
      const keypair = StellarSDK.Keypair.fromSecret(secretKey);
      transaction.sign(keypair);
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to sign transaction: ${error.message}`);
      throw new Error(`Transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(operationsCount: number): Promise<string> {
    try {
      const server = this.stellarConfig.getServer();
      const feeStats = await server.feeStats();
      // Use median fee from network
      const baseFee = (feeStats as any).fee_charged.mode || StellarSDK.BASE_FEE;
      const totalFee = (parseInt(baseFee) * operationsCount).toString();
      return totalFee;
    } catch (error) {
      // Fallback to base fee
      return (parseInt(StellarSDK.BASE_FEE) * operationsCount).toString();
    }
  }

  /**
   * Submit transaction to network
   */
  async submitTransaction(transaction: any): Promise<any> {
    try {
      const server = this.stellarConfig.getServer();
      const result = await server.submitTransaction(transaction);
      this.logger.log(`Transaction submitted: ${result.hash}`);
      return result;
    } catch (error) {
      this.logger.error(`Transaction submission failed: ${error.message}`);
      // Parse Stellar error
      if (error.response?.data?.extras?.result_codes) {
        const codes = error.response.data.extras.result_codes;
        throw new Error(`Transaction failed: ${JSON.stringify(codes)}`);
      }
      throw new Error(`Transaction submission failed: ${error.message}`);
    }
  }
}
