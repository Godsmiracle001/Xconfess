"use client";

import Link from "next/link";
import type { SearchConfession } from "@/app/lib/types/search";
import { cn } from "@/app/lib/utils/cn";

interface SearchResultItemProps {
  confession: SearchConfession;
  searchQuery?: string;
  className?: string;
}

function timeAgo(date: string) {
  const ts = new Date(date).getTime();
  if (Number.isNaN(ts)) return "Unknown date";
  
  const seconds = Math.floor((Date.now() - ts) / 1000);
  
  // Handle future dates (clock skew)
  if (seconds < 0) {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric", // Added year for future dates
    });
  }
  
  // Relative time formatting
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  // Older posts - no year needed for current year posts
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}


/**
 * Highlights occurrences of `query` in `text` (case-insensitive).
 * Returns an array of fragments: either plain strings or { highlight: true, text }.
 */
function highlightFragments(
  text: string,
  query: string
): Array<{ highlight: boolean; text: string }> {
  const q = query.trim().toLowerCase();
  if (!q || !text) {
    return [{ highlight: false, text }];
  }

  const lower = text.toLowerCase();
  const result: Array<{ highlight: boolean; text: string }> = [];
  let last = 0;

  let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > last) {
      result.push({ highlight: false, text: text.slice(last, idx) });
    }
    result.push({ highlight: true, text: text.slice(idx, idx + q.length) });
    last = idx + q.length;
    idx = lower.indexOf(q, last);
  }
  if (last < text.length) {
    result.push({ highlight: false, text: text.slice(last) });
  }
  return result;
}

function HighlightedContent({
  content,
  query,
  className,
}: {
  content: string;
  query?: string;
  className?: string;
}) {
  const fragments = highlightFragments(content, query ?? "");
  return (
    <p className={cn("text-zinc-200 leading-relaxed line-clamp-3", className)}>
      {fragments.map((f, i) =>
        f.highlight ? (
          <mark
            key={i}
            className="bg-amber-500/30 text-amber-200 rounded px-0.5 font-medium"
          >
            {f.text}
          </mark>
        ) : (
          <span key={i}>{f.text}</span>
        )
      )}
    </p>
  );
}

export function SearchResultItem({
  confession,
  searchQuery,
  className,
}: SearchResultItemProps) {
  const totalReactions =
    confession.reactions.like + confession.reactions.love;

  return (
    <Link
      href={`/confessions/${confession.id}`}
      className={cn(
        "block rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5",
        "hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        className
      )}
      data-testid="search-result-item"
    >
      <HighlightedContent
        content={confession.content}
        query={searchQuery}
        className="mb-3"
      />
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
        <span>{timeAgo(confession.createdAt)}</span>
        <span>♥ {totalReactions} reactions</span>
        {confession.commentCount != null && (
          <span>💬 {confession.commentCount}</span>
        )}
        {confession.viewCount != null && (
          <span>👁 {confession.viewCount}</span>
        )}
      </div>
    </Link>
  );
}
