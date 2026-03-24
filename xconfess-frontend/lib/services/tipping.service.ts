/**
 * Tipping Service
 * Handles XLM tipping functionality for confessions
 */

import * as StellarSDK from '@stellar/stellar-sdk';

const MIN_TIP_AMOUNT = 0.1; // Minimum tip in XLM
const SIGN_TIMEOUT_MS = 45000;
const VERIFY_RETRY_ATTEMPTS = 2;
const VERIFY_RETRY_DELAY_MS = 500;

type NetworkKind = 'testnet' | 'mainnet' | 'unknown';

export interface TipStats {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
}

export interface Tip {
  id: string;
  confessionId: string;
  amount: number;
  txId: string;
  senderAddress: string | null;
  createdAt: string;
}

/**
 * Get Stellar network configuration
 */
function getStellarNetwork(): StellarSDK.Networks {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  return network === 'mainnet'
    ? StellarSDK.Networks.PUBLIC
    : StellarSDK.Networks.TESTNET;
}

function getExpectedNetworkKind(): NetworkKind {
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet').toLowerCase();
  if (network === 'mainnet' || network === 'public' || network === 'public_network') {
    return 'mainnet';
  }
  return 'testnet';
}

function normalizeNetworkKind(network: unknown): NetworkKind {
  if (typeof network !== 'string') return 'unknown';
  const value = network.toLowerCase();
  if (value.includes('testnet')) return 'testnet';
  if (value.includes('public') || value.includes('mainnet')) return 'mainnet';
  return 'unknown';
}

/**
 * Get Stellar Horizon server
 */
function getStellarServer(): StellarSDK.Horizon.Server {
  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    'https://horizon-testnet.stellar.org';
  return new StellarSDK.Horizon.Server(horizonUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function classifyTipError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('reject') ||
    normalized.includes('declin') ||
    normalized.includes('denied') ||
    normalized.includes('cancel')
  ) {
    return 'Transaction was rejected in your wallet. Review details and retry when ready.';
  }

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return 'Wallet request timed out. Open Freighter, approve if pending, then retry.';
  }

  if (normalized.includes('network mismatch')) {
    return message;
  }

  if (normalized.includes('signer') && normalized.includes('unavailable')) {
    return message;
  }

  if (normalized.includes('insufficient')) {
    return 'Insufficient XLM balance. Fund your wallet and try again.';
  }

  return message || 'Failed to send tip';
}

function isRetryableVerifyError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('503') ||
    message.includes('502')
  );
}

/**
 * Check if Freighter wallet is available
 */
export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const freighter = (window as any).freighterApi;
    return !!freighter;
  } catch {
    return false;
  }
}

/**
 * Send a tip to a confession
 * @param confessionId - The ID of the confession to tip
 * @param amount - The amount in XLM to tip (minimum 0.1)
 * @param recipientAddress - The Stellar address of the confession creator
 * @returns Transaction hash if successful
 */
export async function sendTip(
  confessionId: string,
  amount: number,
  recipientAddress: string,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Validate minimum tip amount
    if (amount < MIN_TIP_AMOUNT) {
      return {
        success: false,
        error: `Minimum tip amount is ${MIN_TIP_AMOUNT} XLM`,
      };
    }

    // Check if Freighter is available
    const freighter = (window as any).freighterApi;
    if (!freighter) {
      return {
        success: false,
        error: 'Freighter wallet not found. Please install Freighter extension.',
      };
    }
    if (typeof freighter.signTransaction !== 'function') {
      return {
        success: false,
        error: 'Wallet signer unavailable. Unlock Freighter and try again.',
      };
    }

    // Get public key from wallet
    const publicKey = await freighter.getPublicKey();
    if (!publicKey) {
      return {
        success: false,
        error: 'Failed to get public key from wallet',
      };
    }

    if (typeof freighter.getNetwork === 'function') {
      const walletNetwork = await freighter.getNetwork().catch(() => null);
      const walletKind = normalizeNetworkKind(walletNetwork);
      const expectedKind = getExpectedNetworkKind();
      if (walletKind !== 'unknown' && walletKind !== expectedKind) {
        return {
          success: false,
          error: `Wallet network mismatch. Switch Freighter to ${expectedKind === 'mainnet' ? 'Stellar Mainnet' : 'Stellar Testnet'} and retry.`,
        };
      }
    }

    const network = getStellarNetwork();
    const server = getStellarServer();

    // Load sender account
    const senderAccount = await server.loadAccount(publicKey);

    // Validate recipient address format
    try {
      StellarSDK.Keypair.fromPublicKey(recipientAddress);
    } catch {
      return {
        success: false,
        error: 'Invalid recipient address',
      };
    }

    // Build payment transaction
    const transactionBuilder = new StellarSDK.TransactionBuilder(senderAccount, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: network,
    })
      .addOperation(
        StellarSDK.Operation.payment({
          destination: recipientAddress,
          asset: StellarSDK.Asset.native(),
          amount: amount.toString(),
        }),
      )
      .setTimeout(30);

    // Optional: Add memo with confession ID for tracking
    // Remove this line for full anonymity (no link between tip and confession on-chain)
    // transactionBuilder.addMemo(StellarSDK.Memo.text(`tip:${confessionId}`));

    const transaction = transactionBuilder.build();

    // Sign transaction with Freighter
    const signedTxResult = await withTimeout(
      Promise.resolve(
        freighter.signTransaction(transaction.toXDR(), {
          network,
        }),
      ),
      SIGN_TIMEOUT_MS,
      'Wallet signature request timed out. Open Freighter and approve the transaction, then retry.',
    );

    const signedTx =
      typeof signedTxResult === 'string'
        ? signedTxResult
        : signedTxResult?.signedTxXdr || signedTxResult?.signedXDR || signedTxResult?.xdr;

    if (!signedTx) {
      return {
        success: false,
        error: 'Signer unavailable or transaction signature failed.',
      };
    }

    // Submit transaction
    const tx = StellarSDK.TransactionBuilder.fromXDR(signedTx, network);
    const result = await withTimeout(
      server.submitTransaction(tx),
      SIGN_TIMEOUT_MS,
      'Transaction submission timed out. Check wallet activity and retry verification.',
    );

    if (!result.hash) {
      return {
        success: false,
        error: 'Transaction submitted but no hash returned',
      };
    }

    // Verify transaction was successful
    if (result.successful !== true) {
      return {
        success: false,
        error: 'Transaction failed on Stellar network',
      };
    }

    return {
      success: true,
      txHash: result.hash,
    };
  } catch (error) {
    console.error('Failed to send tip:', error);
    return {
      success: false,
      error: classifyTipError(error),
    };
  }
}

/**
 * Get tips for a confession
 */
export async function getTips(confessionId: string): Promise<Tip[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/confessions/${confessionId}/tips`);

    if (!response.ok) {
      throw new Error('Failed to fetch tips');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get tips:', error);
    return [];
  }
}

/**
 * Get tip statistics for a confession
 */
export async function getTipStats(confessionId: string): Promise<TipStats | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(
      `${apiUrl}/confessions/${confessionId}/tips/stats`,
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tip stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get tip stats:', error);
    return null;
  }
}

/**
 * Verify and record a tip transaction
 */
export async function verifyTip(
  confessionId: string,
  txHash: string,
): Promise<{ success: boolean; tip?: Tip; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const endpoint = `${apiUrl}/confessions/${confessionId}/tips/verify`;
  const idempotencyKey = `tip-verify:${confessionId}:${txHash}`;

  for (let attempt = 1; attempt <= VERIFY_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ txId: txHash }),
      });

      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: true,
          tip: body as Tip,
        };
      }

      const message = typeof body?.message === 'string' ? body.message : 'Failed to verify tip';
      const normalized = message.toLowerCase();
      const replaySafeConflict =
        response.status === 409 &&
        (normalized.includes('already') ||
          normalized.includes('duplicate') ||
          normalized.includes('replay'));

      if (replaySafeConflict) {
        return {
          success: true,
          tip: (body?.tip as Tip | undefined) ?? undefined,
        };
      }

      const shouldRetry = attempt < VERIFY_RETRY_ATTEMPTS && response.status >= 500;
      if (shouldRetry) {
        await sleep(VERIFY_RETRY_DELAY_MS * attempt);
        continue;
      }

      throw new Error(message);
    } catch (error) {
      if (attempt < VERIFY_RETRY_ATTEMPTS && isRetryableVerifyError(error)) {
        await sleep(VERIFY_RETRY_DELAY_MS * attempt);
        continue;
      }
      console.error('Failed to verify tip:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to verify tip',
      };
    }
  }

  return {
    success: false,
    error: 'Failed to verify tip after retries',
  };
}
