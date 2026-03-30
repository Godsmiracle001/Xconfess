"use client";

import { useState } from "react";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";
import { Button } from "@/app/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Anchor,
} from "lucide-react";
import { cn } from "@/app/lib/utils/cn";
import { useActivityStore } from "@/app/lib/store/activity.store";
import { v4 as uuidv4 } from "uuid";

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
  const {
    isAvailable,
    isConnected,
    isReady,
    readinessError,
    connect,
    anchor,
    isLoading,
  } = useStellarWallet();

  const addActivity = useActivityStore((s) => s.addActivity);
  const updateActivity = useActivityStore((s) => s.updateActivity);

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
      } catch {
        setError("Failed to connect wallet");
        return;
      }
    }

    setIsAnchoring(true);

    // ✅ Create activity FIRST
    const activityId = uuidv4();
    addActivity({
      id: activityId,
      type: "anchor",
      status: "submitted",
      createdAt: Date.now(),
      confessionId,
    });

    try {
      const result = await anchor(confessionContent);

      if (result.success && result.txHash) {
        // update activity with txHash
        updateActivity(activityId, {
          txHash: result.txHash,
        });

        // save to backend
        const response = await fetch(
          `/api/confessions/${confessionId}/anchor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stellarTxHash: result.txHash,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save anchor");
        }

        // mark as confirmed
        updateActivity(activityId, {
          status: "confirmed",
          updatedAt: Date.now(),
        });

        setTxHash(result.txHash);
        setAnchored(true);
        onAnchorSuccess?.(result.txHash);
      } else {
        updateActivity(activityId, {
          status: "failed",
          updatedAt: Date.now(),
        });

        setError(result.error || "Failed to anchor confession");
      }
    } catch (err) {
      updateActivity(activityId, {
        status: "failed",
        updatedAt: Date.now(),
      });

      const message =
        err instanceof Error ? err.message : "Failed to anchor confession";
      setError(message);
    } finally {
      setIsAnchoring(false);
    }
  };

  // ✅ Already anchored UI
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
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  // ❌ Wallet not available
  if (!isAvailable) {
    return (
      <div className={cn("text-xs text-zinc-500", className)}>
        Wallet required
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnchor}
        disabled={isAnchoring || isLoading || (isConnected && !isReady)}
        className="h-7 px-2 text-xs"
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
        <div className="text-xs text-red-400">{error}</div>
      )}

      {isConnected && !isReady && !error && (
        <div className="text-xs text-orange-400">
          {readinessError}
        </div>
      )}
    </div>
  );
};