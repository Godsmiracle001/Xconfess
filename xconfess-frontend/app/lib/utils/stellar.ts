import * as StellarSDK from "@stellar/stellar-sdk";
import CryptoJS from "crypto-js";

export function hashConfession(content: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const payload = JSON.stringify({ content, timestamp: ts });
  return CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);
}

export function getStellarNetwork(): StellarSDK.Networks {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
  return network === "mainnet"
    ? StellarSDK.Networks.PUBLIC
    : StellarSDK.Networks.TESTNET;
}

export function getStellarServer(): StellarSDK.Horizon.Server {
  const horizonUrl =
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
    "https://horizon-testnet.stellar.org";
  return new StellarSDK.Horizon.Server(horizonUrl);
}

export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighterApi;
    return !!freighter;
  } catch {
    return false;
  }
}

export async function getPublicKey(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighterApi;
    if (!freighter) return null;

    const publicKey = await freighter.getPublicKey();
    return publicKey || null;
  } catch (error) {
    console.error("Failed to get public key:", error);
    return null;
  }
}

export async function anchorConfession(
  confessionHash: string,
  timestamp: number,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contractId = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID;
    if (!contractId) {
      return {
        success: false,
        error: "Stellar contract ID not configured",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighterApi;
    if (!freighter) {
      return {
        success: false,
        error: "Freighter wallet not found",
      };
    }

    const publicKey = await freighter.getPublicKey();
    if (!publicKey) {
      return {
        success: false,
        error: "Failed to get public key from wallet",
      };
    }

    const network = getStellarNetwork();
    const horizonServer = getStellarServer();

    const sorobanRpcUrl =
      process.env.NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL ||
      (network === StellarSDK.Networks.PUBLIC
        ? "https://soroban-rpc.mainnet.stellar.org"
        : "https://soroban-rpc-testnet.stellar.org");
    const sorobanServer = new StellarSDK.rpc.Server(sorobanRpcUrl);

    const account = await horizonServer.loadAccount(publicKey);
    const contract = new StellarSDK.Contract(contractId);

    const hexToUint8Array = (hex: string): Uint8Array => {
      const matches = hex.match(/.{1,2}/g);
      if (!matches) throw new Error("Invalid hex string");
      return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    };

    const hashArray = hexToUint8Array(confessionHash);
    if (hashArray.length !== 32) {
      throw new Error("Invalid hash length");
    }

    // @ts-ignore
    const hashBytes = StellarSDK.xdr.ScVal.scvBytes(hashArray);
    const timestampVal = StellarSDK.xdr.ScVal.scvU64(
      StellarSDK.xdr.Uint64.fromString(timestamp.toString()),
    );

    const transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: network,
    })
      .addOperation(contract.call("anchor_confession", hashBytes, timestampVal))
      .setTimeout(30)
      .build();

    const preparedTx = await sorobanServer.prepareTransaction(transaction);
    const signedTx = await freighter.signTransaction(
      preparedTx.toXDR(),
      network,
    );

    const submitResponse = await sorobanServer.sendTransaction(
      StellarSDK.TransactionBuilder.fromXDR(signedTx, network),
    );

    const status = submitResponse.status as string;

    if (status === "ERROR") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorDetails =
        submitResponse.errorResultXdr ||
        submitResponse.errorResult ||
        (submitResponse as any).details ||
        "Unknown error";
      throw new Error(`Transaction submission error: ${errorDetails}`);
    }

    if (status === "DUPLICATE") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorDetails =
        submitResponse.errorResultXdr ||
        submitResponse.errorResult ||
        (submitResponse as any).details ||
        "Transaction already submitted";
      throw new Error(`Duplicate transaction: ${errorDetails}`);
    }

    if (status === "TRY_AGAIN_LATER") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      throw new Error(
        "Transaction submission temporarily unavailable, please try again",
      );
    }

    if (status === "PENDING") {
      if (!submitResponse.hash) {
        throw new Error("Transaction submitted but no hash returned");
      }
    } else if (status !== "SUCCESS" && status !== "ACCEPTED") {
      if (!submitResponse.hash) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorDetails =
          submitResponse.errorResultXdr ||
          submitResponse.errorResult ||
          (submitResponse as any).details ||
          `Unexpected status: ${status}`;
        throw new Error(`Transaction submission failed: ${errorDetails}`);
      }
    }

    if (!submitResponse.hash) {
      throw new Error("Transaction submitted but no hash returned for polling");
    }

    let txResponse;
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = await sorobanServer.getTransaction(submitResponse.hash);

      if (result.status === StellarSDK.rpc.Api.GetTransactionStatus.SUCCESS) {
        txResponse = result;
        break;
      } else if (
        result.status === StellarSDK.rpc.Api.GetTransactionStatus.FAILED
      ) {
        throw new Error(`Transaction failed: ${result.resultXdr}`);
      }
    }

    if (!txResponse) {
      throw new Error("Transaction timeout - could not confirm transaction");
    }

    return {
      success: true,
      txHash: submitResponse.hash,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to anchor confession:", error);
    return {
      success: false,
      error: error.message || "Failed to anchor confession on Stellar",
    };
  }
}
