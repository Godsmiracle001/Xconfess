"use client";

import { useState, useEffect } from "react";

interface Props {
  type: "like" | "love";
  count: number;
  confessionId: string;
}

export const ReactionButton = ({ type, count, confessionId }: Props) => {
  const [localCount, setLocalCount] = useState(count);

  // Sync localCount with prop changes (e.g., after refetch)
  useEffect(() => {
    setLocalCount(count);
  }, [count]);

  const react = async () => {
    setLocalCount((c) => c + 1); // optimistic update

    try {
      const res = await fetch(`/api/confessions/${confessionId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        throw new Error("Failed to react");
      }
    } catch (error) {
      // Rollback on failure
      setLocalCount((c) => c - 1);
      console.error("Failed to react:", error);
      // Optional: Add toast notification here
    }
  };

  return (
    <button
      onClick={react}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors min-w-[44px] min-h-[44px] justify-center touch-manipulation"
      aria-label={`React with ${type}`}
    >
      <span className="text-lg">{type === "like" ? "👍" : "❤️"}</span>
      <span className="text-sm font-medium">{localCount}</span>
    </button>
  );
};
