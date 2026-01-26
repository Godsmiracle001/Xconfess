"use client";

import { useState } from "react";
import { ReactionButton } from "./ReactionButtons";
import { AnchorButton } from "./AnchorButton";

interface Props {
  confession: {
    id: string;
    content: string;
    createdAt: string;
    reactions: { like: number; love: number };
    author?: {
      id: string;
      username?: string;
      avatar?: string;
    };
    commentCount?: number;
    viewCount?: number;
    isAnchored?: boolean;
    stellarTxHash?: string | null;
  };
}

export const ConfessionCard = ({ confession }: Props) => {
  const [isAnchored, setIsAnchored] = useState(confession.isAnchored || false);
  const [txHash, setTxHash] = useState<string | null>(
    confession.stellarTxHash || null
  );

  const handleAnchorSuccess = (newTxHash: string) => {
    setIsAnchored(true);
    setTxHash(newTxHash);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      {/* Header: Author and Timestamp */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {confession.author?.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={confession.author.avatar}
              alt={confession.author?.username || "Anonymous"}
              className="w-10 h-10 rounded-full bg-zinc-700 object-cover"
            />
          )}
          <p className="text-base font-medium text-gray-300">
            {confession.author?.username || "Anonymous"}
          </p>
        </div>
        <p className="text-xs sm:text-sm text-gray-500">
          {timeAgo(confession.createdAt)}
        </p>
      </div>

      {/* Content */}
      <p className="text-white text-lg mb-4 leading-relaxed wrap-break-word">
        {confession.content}
      </p>

      {/* Metadata and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {confession.viewCount !== undefined && (
            <div className="flex items-center gap-2 min-h-[44px] min-w-[44px]">
              <span className="text-lg">👁️</span>
              <span>{confession.viewCount}</span>
            </div>
          )}
          {confession.commentCount !== undefined && (
            <button className="flex items-center gap-2 hover:text-gray-300 transition-colors cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation">
              <span className="text-lg">💬</span>
              <span>{confession.commentCount}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <AnchorButton
            confessionId={confession.id}
            confessionContent={confession.content}
            isAnchored={isAnchored}
            stellarTxHash={txHash}
            onAnchorSuccess={handleAnchorSuccess}
          />
          <div className="flex gap-2">
            <ReactionButton
              type="like"
              count={confession.reactions.like}
              confessionId={confession.id}
            />
            <ReactionButton
              type="love"
              count={confession.reactions.love}
              confessionId={confession.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
