/**
 * Tipping Service
 * Handles XLM tipping functionality for confessions
 */

import {
  Networks,
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { ActivityStatus } from "@/app/lib/types/activity";
import {
  isFreighterInstalled,
  freighterGetPublicKey,
  freighterSignTransaction,
} from "../wallet/freighterAdapter";

const MIN_TIP_AMOUNT = 0.1;

// -------------------- Types --------------------

export type NetworkKind = "testnet" | "mainnet" | "unknown";

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

// -------------------- Helpers --------------------

function getStellarNetwork(): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
  return network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

function getStellarServer(): Horizon.Server {
  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    "https://horizon-testnet.stellar.org";
  return new Horizon.Server(horizonUrl);
}

function classifyTipError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("reject") || normalized.includes("declin") || normalized.includes("denied") || normalized.includes("cancel")) {
    return "Transaction was rejected in your wallet.";
  }

  if (normalized.includes("timeout")) return "Wallet request timed out.";
  if (normalized.includes("network mismatch")) return message;
  if (normalized.includes("insufficient")) return "Insufficient XLM balance.";

  return message || "Failed to send tip";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------- Fake Checker --------------------

/**
 * Fake status checker — replace with actual backend or Stellar SDK call
 */
export const checkTransactionStatus = async (): Promise<ActivityStatus> => {
  await sleep(2000);

  const random = Math.random();
  if (random > 0.7) return "confirmed";
  if (random > 0.4) return "failed";
  return "submitted";
};

// -------------------- Wallet Helpers --------------------

export async function isFreighterAvailable(): Promise<boolean> {
  return isFreighterInstalled();
}

// -------------------- Send Tip --------------------

export async function sendTip(
  confessionId: string,
  amount: number,
  recipientAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (amount < MIN_TIP_AMOUNT) {
      return { success: false, error: `Minimum tip amount is ${MIN_TIP_AMOUNT} XLM` };
    }

    if (!isFreighterInstalled()) {
      return { success: false, error: "Freighter wallet not found" };
    }

    let publicKey: string;
    try {
      publicKey = await freighterGetPublicKey();
    } catch {
      return { success: false, error: "Freighter wallet not found" };
    }

    const network = getStellarNetwork();
    const server = getStellarServer();

    const senderAccount = await server.loadAccount(publicKey);

    // Validate recipient
    try { Keypair.fromPublicKey(recipientAddress); } catch {
      return { success: false, error: "Invalid recipient address" };
    }

    const transaction = new TransactionBuilder(senderAccount, { fee: BASE_FEE, networkPassphrase: network })
      .addOperation(Operation.payment({ destination: recipientAddress, asset: Asset.native(), amount: amount.toString() }))
      .setTimeout(30)
      .build();

    const signedXDR = await freighterSignTransaction(transaction.toXDR(), network);
    const tx = TransactionBuilder.fromXDR(signedXDR, network);
    const result = await server.submitTransaction(tx);

    if (!result.hash) return { success: false, error: "No transaction hash returned" };

    return { success: true, txHash: result.hash };
  } catch (error) {
    console.error(error);
    return { success: false, error: classifyTipError(error) };
  }
}

// -------------------- Verify Tip --------------------

export async function verifyTip(
  confessionId: string,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/confessions/${confessionId}/verify-tip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.message || "Verification failed" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------- Get Tip Stats --------------------

export async function getTipStats(confessionId: string): Promise<TipStats | null> {
  try {
    const res = await fetch(`/api/confessions/${confessionId}/tip-stats`);
    if (!res.ok) return null;
    return (await res.json()) as TipStats;
  } catch {
    return null;
  }
}