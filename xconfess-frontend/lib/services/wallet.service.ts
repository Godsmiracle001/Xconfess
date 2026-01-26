/**
 * Wallet Service
 * Handles interactions with the Freighter wallet API for Stellar network
 */

interface Keypair {
  publicKey: string;
  secretKey?: string;
}

interface TransactionSigningRequest {
  xdr: string;
  callback?: (result: { signedXDR?: string; error?: string }) => void;
}

interface WalletConnectResponse {
  publicKey: string;
  network: string;
}

/**
 * Check if Freighter wallet is installed
 */
export const isFreighterInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as any).freighter !== undefined;
};

/**
 * Connect to the Freighter wallet
 * @returns Promise with public key and network info
 */
export const connectWallet = async (): Promise<WalletConnectResponse> => {
  try {
    if (!isFreighterInstalled()) {
      throw new Error(
        'Freighter wallet is not installed. Please install it from https://www.freighter.app/'
      );
    }

    const freighter = (window as any).freighter;

    // Request public key from Freighter
    const publicKey = await freighter.getPublicKey();

    if (!publicKey) {
      throw new Error('Failed to get public key from Freighter wallet');
    }

    // Get the current network
    const network = await freighter.getNetwork();

    return {
      publicKey,
      network,
    };
  } catch (error) {
    throw new Error(
      `Wallet connection failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Disconnect from the wallet
 */
export const disconnectWallet = async (): Promise<void> => {
  try {
    const freighter = (window as any).freighter;

    // Freighter doesn't have a built-in disconnect, but we can clear local state
    // This is typically handled on the app level by clearing stored wallet data
    if (freighter && freighter.disconnect) {
      await freighter.disconnect();
    }
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
};

/**
 * Get the public key from the connected wallet
 * @returns Public key string
 */
export const getPublicKey = async (): Promise<string> => {
  try {
    if (!isFreighterInstalled()) {
      throw new Error('Freighter wallet is not installed');
    }

    const freighter = (window as any).freighter;
    const publicKey = await freighter.getPublicKey();

    if (!publicKey) {
      throw new Error('No wallet connected');
    }

    return publicKey;
  } catch (error) {
    throw new Error(
      `Failed to get public key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Sign a transaction with the connected wallet
 * @param transactionXDR - The transaction XDR to sign
 * @returns Signed transaction XDR
 */
export const signTransaction = async (transactionXDR: string): Promise<string> => {
  try {
    if (!isFreighterInstalled()) {
      throw new Error('Freighter wallet is not installed');
    }

    const freighter = (window as any).freighter;

    // Request signature from Freighter
    const result = await freighter.signTransaction(transactionXDR, {
      network: await getNetwork(),
    });

    if (!result) {
      throw new Error('Failed to sign transaction');
    }

    return result;
  } catch (error) {
    throw new Error(
      `Transaction signing failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Get the current network (testnet or mainnet)
 * @returns Network string
 */
export const getNetwork = async (): Promise<string> => {
  try {
    if (!isFreighterInstalled()) {
      throw new Error('Freighter wallet is not installed');
    }

    const freighter = (window as any).freighter;
    const network = await freighter.getNetwork();

    return network || 'TESTNET_SOROBAN';
  } catch (error) {
    console.error('Failed to get network:', error);
    return 'TESTNET_SOROBAN';
  }
};

/**
 * Check if the wallet is connected
 * @returns Boolean indicating connection status
 */
export const isWalletConnected = async (): Promise<boolean> => {
  try {
    if (!isFreighterInstalled()) {
      return false;
    }

    const publicKey = await getPublicKey();
    return !!publicKey;
  } catch {
    return false;
  }
};

/**
 * Get wallet info (public key and network)
 * @returns Wallet info object
 */
export const getWalletInfo = async (): Promise<WalletConnectResponse | null> => {
  try {
    const isConnected = await isWalletConnected();

    if (!isConnected) {
      return null;
    }

    const publicKey = await getPublicKey();
    const network = await getNetwork();

    return {
      publicKey,
      network,
    };
  } catch {
    return null;
  }
};

/**
 * Check if the wallet is on the correct network
 * @param requiredNetwork - The required network (e.g., 'TESTNET_SOROBAN')
 * @returns Boolean indicating if on correct network
 */
export const isOnCorrectNetwork = async (requiredNetwork: string): Promise<boolean> => {
  try {
    const currentNetwork = await getNetwork();
    return currentNetwork === requiredNetwork;
  } catch {
    return false;
  }
};
