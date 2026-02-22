"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ReactionButton } from "./ReactionButtons";
import type { NormalizedConfession } from "../../lib/utils/normalizeConfession";

import { Confession } from "@/app/lib/types/confession";

interface Props {
  confession: NormalizedConfession;
}

export const ConfessionCard = memo(({ confession }: Props) => {
  const [isAnchored, setIsAnchored] = useState(confession.isAnchored || false);
  const [txHash, setTxHash] = useState<string | null>(
    confession.stellarTxHash || null
  );
  const [tipStats, setTipStats] = useState<TipStats | null>(
    confession.tipStats || null
  );

  useEffect(() => {
    // Fetch tip stats if not provided
    if (!tipStats) {
      getTipStats(confession.id).then((stats) => {
        if (stats) {
          setTipStats(stats);
        }
      });
    }
  }, [confession.id, tipStats]);

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
            <Image
              src={confession.author.avatar}
              alt={confession.author?.username || "Anonymous"}
              width={40}
              height={40}
              className="rounded-full bg-zinc-700 object-cover"
              loading="lazy"
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

      {/* Content - link to detail */}
      <Link href={`/confessions/${confession.id}`} className="block group">
        <p className="text-white text-lg mb-4 leading-relaxed wrap-break-word group-hover:text-zinc-200 transition-colors">
          {confession.content}
        </p>
      </Link>

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
            <Link
              href={`/confessions/${confession.id}#comments`}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <span className="text-lg">💬</span>
              <span>{confession.commentCount}</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TipButton
            confessionId={confession.id}
            recipientAddress={confession.author?.stellarAddress}
            initialStats={tipStats || undefined}
          />
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
});
