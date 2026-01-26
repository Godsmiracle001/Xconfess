"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isFreighterAvailable,
  getPublicKey,
  anchorConfession,
  hashConfession,
} from "@/app/lib/utils/stellar";

export interface StellarWalletState {
  isAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useStellarWallet() {
  const [state, setState] = useState<StellarWalletState>({
    isAvailable: false,
    isConnected: false,
    publicKey: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkWallet = async () => {
      const available = await isFreighterAvailable();
      setState((prev) => ({
        ...prev,
        isAvailable: available,
        isLoading: false,
      }));
    };

    checkWallet();
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const available = await isFreighterAvailable();
      if (!available) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Freighter wallet not found. Please install Freighter extension.",
        }));
        return;
      }

      const publicKey = await getPublicKey();
      if (!publicKey) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to connect wallet. Please check Freighter.",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isConnected: true,
        publicKey,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to connect wallet",
      }));
    }
  }, []);

  const anchor = useCallback(
    async (content: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (!state.isConnected || !state.publicKey) {
        setState((prev) => ({
          ...prev,
          error: "Wallet not connected",
        }));
        return {
          success: false,
          error: "Wallet not connected",
        };
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const timestamp = Date.now();
        const hash = hashConfession(content, timestamp);
        const result = await anchorConfession(hash, timestamp);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || null,
        }));

        return result;
      } catch (error: any) {
        const errorMessage = error.message || "Failed to anchor confession";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [state.isConnected, state.publicKey]
  );

  return {
    ...state,
    connect,
    anchor,
  };
}
