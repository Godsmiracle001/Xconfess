import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AnchorData {
  stellarTxHash: string;
  stellarHash: string;
  anchoredAt: Date;
}

@Injectable()
export class StellarService {
  private readonly contractId: string;
  private readonly network: string;
  private readonly horizonUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.contractId = this.configService.get<string>(
      'CONFESSION_ANCHOR_CONTRACT',
      'CCHDY246UUPY6VUGIDVSK266KXA64CXM6RR2QLTKJD7E7IGV74ZP5XFB',
    );
    this.network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    this.horizonUrl = this.configService.get<string>(
      'STELLAR_HORIZON_URL',
      'https://horizon-testnet.stellar.org',
    );
  }

  /**
   * Generate SHA-256 hash of confession content for anchoring
   */
  hashConfession(content: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const payload = JSON.stringify({ content, timestamp: ts });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Validate a Stellar transaction hash format
   */
  isValidTxHash(txHash: string): boolean {
    if (!txHash || typeof txHash !== 'string') {
      return false;
    }
    // Stellar transaction hashes are 64 character hex strings
    return /^[a-fA-F0-9]{64}$/.test(txHash);
  }

  /**
   * Build the Stellar Explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    const baseUrl =
      this.network === 'mainnet'
        ? 'https://stellar.expert/explorer/public/tx'
        : 'https://stellar.expert/explorer/testnet/tx';
    return `${baseUrl}/${txHash}`;
  }

  /**
   * Build the Horizon API URL for a transaction
   */
  getHorizonTxUrl(txHash: string): string {
    return `${this.horizonUrl}/transactions/${txHash}`;
  }

  /**
   * Verify a transaction exists on the Stellar network
   * Returns true if transaction is found and successful
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    if (!this.isValidTxHash(txHash)) {
      return false;
    }

    try {
      const response = await fetch(this.getHorizonTxUrl(txHash));
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.successful === true;
    } catch (error) {
      console.error('Error verifying Stellar transaction:', error);
      return false;
    }
  }

  /**
   * Process anchoring data from frontend
   * Validates and prepares data for storage
   */
  processAnchorData(
    confessionContent: string,
    txHash: string,
    timestamp?: number,
  ): AnchorData | null {
    if (!this.isValidTxHash(txHash)) {
      return null;
    }

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
  getContractInfo(): { contractId: string; network: string; horizonUrl: string } {
    return {
      contractId: this.contractId,
      network: this.network,
      horizonUrl: this.horizonUrl,
    };
  }
}
