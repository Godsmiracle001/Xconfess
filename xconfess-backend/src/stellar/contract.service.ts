import { Injectable, Logger } from '@nestjs/common';
import * as StellarSDK from '@stellar/stellar-sdk';
import { StellarConfigService } from './stellar-config.service';
import { TransactionBuilderService } from './transaction-builder.service';
import {
  IContractInvocation,
  ITransactionResult,
} from './interfaces/stellar-config.interface';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    private stellarConfig: StellarConfigService,
    private txBuilder: TransactionBuilderService,
  ) {}

  /**
   * Invoke Soroban contract function
   */
  async invokeContract(
    invocation: IContractInvocation,
    signerSecret: string,
  ): Promise<ITransactionResult> {
    try {
      // Create contract instance
      const contract = new StellarSDK.Contract(invocation.contractId);
      // BUG: Not encoding parameters correctly (to be fixed in later commit)
      const encodedArgs = this.encodeContractArgs(invocation.args);
      // Build contract invocation operation
      const operation = contract.call(invocation.functionName, ...encodedArgs);
      // Build transaction
      const tx = await this.txBuilder.buildTransaction(
        invocation.sourceAccount,
        [operation],
      );
      // Sign transaction
      const signedTx = this.txBuilder.signTransaction(tx, signerSecret);
      // Submit transaction
      const result = await this.txBuilder.submitTransaction(signedTx);
      // Decode result
      const decodedResult = this.decodeContractResult(result);
      return {
        hash: result.hash,
        success: result.successful,
        result: decodedResult,
      };
    } catch (error) {
      this.logger.error(`Contract invocation failed: ${error.message}`);
      throw new Error(`Contract call failed: ${error.message}`);
    }
  }

  /**
   * Anchor confession hash on-chain
   */
  async anchorConfession(
    confessionHash: string,
    timestamp: number,
    signerSecret: string,
  ): Promise<ITransactionResult> {
    const contractId = this.stellarConfig.getContractId('confessionAnchor');
    const signerKeypair = StellarSDK.Keypair.fromSecret(signerSecret);
    return this.invokeContract(
      {
        contractId,
        functionName: 'anchor_confession',
        args: [
          StellarSDK.nativeToScVal(confessionHash, { type: 'bytes' }),
          StellarSDK.nativeToScVal(timestamp, { type: 'u64' }),
        ],
        sourceAccount: signerKeypair.publicKey(),
      },
      signerSecret,
    );
  }

  /**
   * Verify confession on-chain
   */
  async verifyConfession(confessionHash: string): Promise<number | null> {
    try {
      const contractId = this.stellarConfig.getContractId('confessionAnchor');
      const contract = new StellarSDK.Contract(contractId);
      // Call view function (read-only, no transaction)
      const result = await contract.call(
        'verify_confession',
        StellarSDK.nativeToScVal(confessionHash, { type: 'bytes' }),
      );
      // Decode timestamp
      const timestamp = StellarSDK.scValToNative(result as any);
      return timestamp || null;
    } catch (error) {
      this.logger.warn(`Confession not found on-chain: ${confessionHash}`);
      return null;
    }
  }

  /**
   * Proper ScVal encoding for contract parameters
   */
  private encodeContractArgs(args: any[]): any[] {
    return args.map((arg) => {
      if (typeof arg === 'string') {
        return StellarSDK.nativeToScVal(arg, { type: 'string' });
      } else if (typeof arg === 'number') {
        return StellarSDK.nativeToScVal(arg, { type: 'u64' });
      } else if (typeof arg === 'boolean') {
        return StellarSDK.nativeToScVal(arg, { type: 'bool' });
      } else if (Buffer.isBuffer(arg)) {
        return StellarSDK.nativeToScVal(arg, { type: 'bytes' });
      } else {
        // Assume it's already an ScVal
        return arg;
      }
    });
  }

  /**
   * Decode contract result
   */
  private decodeContractResult(result: any): any {
    try {
      if (!result.result_xdr) return null;
      const xdr = StellarSDK.xdr.TransactionResult.fromXDR(
        result.result_xdr,
        'base64',
      );
      // Extract and decode result
      const resultValue = xdr.result().value();
      return StellarSDK.scValToNative(resultValue as any);
    } catch (error) {
      this.logger.warn(`Could not decode contract result: ${error.message}`);
      return null;
    }
  }
}
