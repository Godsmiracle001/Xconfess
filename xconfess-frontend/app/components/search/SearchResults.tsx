"use client";

import { SearchResultItem } from "./SearchResultItem";
import type { SearchConfession } from "@/app/lib/types/search";
import { SkeletonCard } from "@/app/components/confession/LoadingSkeleton";
import { cn } from "@/app/lib/utils/cn";

interface SearchResultsProps {
  results: SearchConfession[];
  query?: string;
  isLoading: boolean;
  isEmpty: boolean;
  hasSearched: boolean;
  page: number;
  hasMore: boolean;
  total?: number;
  statusMeta?: {
    partial: boolean;
    degraded: boolean;
    message: string | null;
    warnings: string[];
    searchType?: string;
  } | null;
  hasActiveFilters?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onClearFilters?: () => void;
  onUseSuggestion?: (query: string) => void;
  className?: string;
  isRetrying?: boolean;
}

export function SearchResults({
  results,
  query,
  isLoading,
  isEmpty,
  hasSearched,
  page,
  hasMore,
  total,
  statusMeta,
  hasActiveFilters = false,
  onLoadMore,
  onRetry,
  onClearFilters,
  onUseSuggestion,
  className,
  isRetrying = false,
}: SearchResultsProps) {
  const suggestions = ["confession", "secret", "relationships"];

  if (isLoading && page === 1) {
    return (
      <div
        className={cn("space-y-4", className)}
        role="status"
        aria-live="polite"
        aria-label={
          isRetrying
            ? "Loading search results, retrying after a connection issue"
            : "Loading search results"
        }
      >
        {isRetrying && (
          <p className="text-sm text-amber-200/90 text-center">
            Search is taking longer than usual — retrying…
          </p>
        )}
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50",
          className
        )}
        role="status"
      >
        <p className="text-zinc-400 text-center">
          Enter a search term or use filters to find confessions.
        </p>
        <p className="text-zinc-500 text-sm mt-2 text-center">
          Try &quot;love&quot;, &quot;secret&quot;, or &quot;coding&quot;.
        </p>
      </div>
    );
  }

  if (isEmpty && !isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-zinc-400 text-center">
          No confessions match your search.
        </p>
        <p className="text-zinc-500 text-sm mt-2 text-center">
          {statusMeta?.partial
            ? "Results may be partial right now. Try a broader query while search catches up."
            : "Try different keywords or loosen your filters."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors text-sm"
            >
              Retry search
            </button>
          )}
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onUseSuggestion?.(suggestion)}
              className="px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-xs"
            >
              Try &quot;{suggestion}&quot;
            </button>
          ))}
        </div>
      </div>
    );
  }

  const start = 1;
  const end = results.length;
  const showCount = total != null && total > 0;

  return (
    <div className={cn("space-y-4", className)} role="region" aria-label="Search results">
      {statusMeta?.degraded && (
        <div
          className="rounded-lg border border-amber-700/70 bg-amber-950/20 px-3 py-2 text-amber-200 text-sm"
          role="status"
        >
          <p className="font-medium">
            {statusMeta.partial
              ? "Partial results shown"
              : "Search is in a degraded state"}
          </p>
          <p className="text-amber-300/90 text-xs mt-1">
            {statusMeta.message ||
              statusMeta.warnings[0] ||
              "Some upstream data may be delayed. You can retry or continue with the current results."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 transition-colors text-xs font-medium"
              >
                Retry
              </button>
            )}
            {hasActiveFilters && onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="px-2.5 py-1 rounded-md border border-amber-700/60 text-amber-100 hover:border-amber-500 transition-colors text-xs font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
      {showCount && (
        <p className="text-sm text-zinc-500">
          Showing {start}–{end} of {total} result{total !== 1 ? "s" : ""}
        </p>
      )}
      <ul className="list-none space-y-3" role="list">
        {results.map((c) => (
          <li key={c.id} role="listitem">
            <SearchResultItem confession={c} searchQuery={query} />
          </li>
        ))}
      </ul>
      {isLoading && page > 1 && (
        <div className="flex justify-center py-6" aria-hidden>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.1s]" />
            <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]" />
          </div>
        </div>
      )}
      {hasMore && !isLoading && onLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
