"use client";

import { useState, useEffect } from "react";
import { cn } from "@/app/lib/utils/cn";
import { Heart, ThumbsUp } from "lucide-react";
import { useReactions } from "@/app/lib/hooks/useReactions";
import type { ReactionType } from "@/app/lib/types/reaction";

interface Props {
  type: ReactionType;
  count: number;
  confessionId: string;
  isActive?: boolean;
}

export const ReactionButton = ({
  type,
  count,
  confessionId,
  isActive = false,
}: Props) => {
  const [localCount, setLocalCount] = useState(count);
  const [active, setActive] = useState(isActive);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addReaction, isPending } = useReactions();

  useEffect(() => {
    setLocalCount(count);
    setActive(isActive);
  }, [count, confessionId, isActive]);

  const react = async () => {
    // Clear any previous errors
    setError(null);

    // Optimistic update
    const previousCount = localCount;
    const wasActive = active;
    
    setLocalCount((c) => c + 1);
    setActive(true);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    try {
      const result = await addReaction({ confessionId, type });
      
      if (!result.ok) {
        // Rollback on error
        setActive(wasActive);
        setLocalCount(previousCount);
        setError(result.error.message || "Failed to add reaction");
        return;
      }

      // Update with actual server count if available
      if (result.data.reactions?.[type] !== undefined) {
        setLocalCount(result.data.reactions[type]);
      }
    } catch (err) {
      // Rollback on exception
      setActive(wasActive);
      setLocalCount(previousCount);
      setError("An unexpected error occurred");
    }
  };
  const Icon = type === "like" ? ThumbsUp : Heart;
  const label = active
    ? `Remove ${type} reaction, current count ${localCount}`
    : `React with ${type}, current count ${localCount}`;

  return (
    <div className="relative">
      <button
        onClick={react}
        disabled={isPending}
        aria-label={label}
        aria-pressed={active}
        title={error || undefined}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-full",
          "min-w-11 min-h-11 touch-manipulation",
          "transition-all duration-200 ease-out",
          "bg-zinc-800 hover:bg-zinc-700",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500",
          "active:scale-95",
          active && "bg-pink-600 text-white",
          isAnimating && "animate-reaction-bounce",
          error && "ring-2 ring-red-500"
        )}
      >
        <span className="text-lg select-none">
          {type === "like" ? "👍" : "❤️"}
        </span>

        <span className="text-sm font-medium">{localCount}</span>
      </button>
      
      {error && (
        <div role="alert" className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};
