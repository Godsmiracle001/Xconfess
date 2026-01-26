'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import * as WalletService from '../services/wallet.service';

export interface WalletState {
  publicKey: string | null;
  network: 'TESTNET_SOROBAN' | 'PUBLIC_NETWORK' | string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isFreighterInstalled: boolean;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  checkConnection: () => Promise<void>;
  switchNetwork: (network: string) => void;
  clearError: () => void;
}

const WALLET_STORAGE_KEY = 'xconfess_wallet';
const NETWORK_STORAGE_KEY = 'xconfess_network';

/**
 * Custom hook for managing wallet connection and state
 * @returns Wallet state and methods
 */
export const useWallet = (): UseWalletReturn => {
  const [state, setState] = useState<WalletState>({
    publicKey: null,
    network: 'TESTNET_SOROBAN',
    isConnected: false,
    isLoading: false,
    error: null,
    isFreighterInstalled: false,
  });

  const hasInitialized = useRef(false);

  /**
   * Initialize wallet on mount
   */
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeWallet();
    }
  }, []);

  /**
   * Initialize wallet state from storage and current wallet connection
   */
  const initializeWallet = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const isInstalled = WalletService.isFreighterInstalled();
      setState((prev) => ({ ...prev, isFreighterInstalled: isInstalled }));

      if (!isInstalled) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Freighter wallet is not installed',
        }));
        return;
      }

      // Check if wallet was previously connected
      const storedNetwork = localStorage.getItem(NETWORK_STORAGE_KEY);
      if (storedNetwork) {
        setState((prev) => ({ ...prev, network: storedNetwork }));
      }

      // Try to reconnect to wallet
      const walletInfo = await WalletService.getWalletInfo();

      if (walletInfo) {
        setState((prev) => ({
          ...prev,
          publicKey: walletInfo.publicKey,
          network: walletInfo.network || prev.network,
          isConnected: true,
          isLoading: false,
          error: null,
        }));

        // Store the network
        localStorage.setItem(NETWORK_STORAGE_KEY, walletInfo.network);
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to initialize wallet';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Connect to wallet
   */
  const connect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const walletInfo = await WalletService.connectWallet();

      setState((prev) => ({
        ...prev,
        publicKey: walletInfo.publicKey,
        network: walletInfo.network,
        isConnected: true,
        isLoading: false,
        error: null,
      }));

      // Store the network
      localStorage.setItem(NETWORK_STORAGE_KEY, walletInfo.network);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect wallet';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isConnected: false,
      }));
      throw error;
    }
  }, []);

  /**
   * Disconnect from wallet
   */
  const disconnect = useCallback(() => {
    try {
      WalletService.disconnectWallet();

      setState((prev) => ({
        ...prev,
        publicKey: null,
        isConnected: false,
        error: null,
      }));

      // Clear stored wallet data
      localStorage.removeItem(WALLET_STORAGE_KEY);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to disconnect wallet';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Sign a transaction
   */
  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const signedXDR = await WalletService.signTransaction(xdr);

      setState((prev) => ({ ...prev, isLoading: false }));

      return signedXDR;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign transaction';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * Check current wallet connection status
   */
  const checkConnection = useCallback(async () => {
    try {
      const walletInfo = await WalletService.getWalletInfo();

      if (walletInfo) {
        setState((prev) => ({
          ...prev,
          publicKey: walletInfo.publicKey,
          network: walletInfo.network,
          isConnected: true,
          error: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          publicKey: null,
          isConnected: false,
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to check wallet connection';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Switch network (local state only, actual network switch handled by wallet)
   */
  const switchNetwork = useCallback((network: string) => {
    setState((prev) => ({
      ...prev,
      network,
    }));
    localStorage.setItem(NETWORK_STORAGE_KEY, network);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    checkConnection,
    switchNetwork,
    clearError,
  };
};
