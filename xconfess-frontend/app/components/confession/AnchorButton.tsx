"use client";

import { useState } from "react";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";
import { Button } from "@/app/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Anchor,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils/cn";

interface AnchorButtonProps {
  confessionId: string;
  confessionContent: string;
  isAnchored?: boolean;
  stellarTxHash?: string | null;
  onAnchorSuccess?: (txHash: string) => void;
  className?: string;
}

export const AnchorButton: React.FC<AnchorButtonProps> = ({
  confessionId,
  confessionContent,
  isAnchored = false,
  stellarTxHash = null,
  onAnchorSuccess,
  className,
}) => {
  const { isAvailable, isConnected, connect, anchor, isLoading } =
    useStellarWallet();
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(stellarTxHash);
  const [error, setError] = useState<string | null>(null);
  const [anchored, setAnchored] = useState(isAnchored);

  const getExplorerUrl = (hash: string) => {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
    const baseUrl =
      network === "mainnet"
        ? "https://stellar.expert/explorer/public/tx"
        : "https://stellar.expert/explorer/testnet/tx";
    return `${baseUrl}/${hash}`;
  };

  const handleAnchor = async () => {
    setError(null);

    if (!isConnected) {
      try {
        await connect();
      } catch (err) {
        setError("Failed to connect wallet");
        return;
      }
    }

    setIsAnchoring(true);

    try {
      const result = await anchor(confessionContent);

      if (result.success && result.txHash) {
        // Call backend to store the anchor data
        const response = await fetch(`/api/confessions/${confessionId}/anchor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stellarTxHash: result.txHash,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to save anchor data to server"
          );
        }

        setTxHash(result.txHash);
        setAnchored(true);
        onAnchorSuccess?.(result.txHash);
      } else {
        setError(result.error || "Failed to anchor confession");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to anchor confession";
      setError(errorMessage);
    } finally {
      setIsAnchoring(false);
    }
  };

  // Already anchored - show status
  if (anchored && txHash) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-xs text-zinc-400">Anchored</span>
        <a
          href={getExplorerUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          title="View on Stellar Explorer"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  // Wallet not available
  if (!isAvailable) {
    return (
      <div
        className={cn("flex items-center gap-1 text-xs text-zinc-500", className)}
        title="Install Freighter wallet to anchor confessions"
      >
        <Anchor className="h-3 w-3" />
        <span>Wallet required</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnchor}
        disabled={isAnchoring || isLoading}
        className="h-7 px-2 text-xs"
        title="Anchor this confession on Stellar blockchain"
      >
        {isAnchoring || isLoading ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Anchoring...
          </>
        ) : (
          <>
            <Anchor className="h-3 w-3 mr-1" />
            Anchor
          </>
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          <span className="truncate max-w-[150px]" title={error}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
};
