"use client";

import { useEffect, useRef } from "react";
import { ConfessionCard } from "./ConfessionCard";
import { SkeletonCard } from "./LoadingSkeleton";
import {
  normalizeConfession,
  type NormalizedConfession,
} from "../../lib/utils/normalizeConfession";
import { useConfessions } from "../../lib/hooks/useConfessions";
import ErrorState from "../common/ErrorState";

export const ConfessionFeed = () => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasMore, loading, error, setPage } =
    useConfessions();

  const confessions: NormalizedConfession[] =
    data?.map((c) => normalizeConfession(c)) ?? [];

  const isEmpty = !loading && confessions.length === 0;

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px", threshold: 0.1 },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loading, fetchNextPage]);

  // Retry handler
  const handleRetry = () => setPage(1); // reload first page

  // Loading skeletons
  const renderLoadingSkeletons = () =>
    Array.from({ length: 3 }).map((_, idx) => (
      <SkeletonCard key={`skeleton-${idx}`} />
    ));

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">
            No confessions yet. Be the first to share!
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          error={error.message ?? "Failed to load confessions"}
          correlationId={error.correlationId}
          title="Failed to load confessions"
          description="Something went wrong while fetching confessions."
          showRetry
          onRetry={handleRetry}
        />
      )}

      {/* Confessions Grid */}
      {!isEmpty && (
        <div className="space-y-4">
          {confessions.map((confession) => (
            <ConfessionCard key={confession.id} confession={confession} />
          ))}

          {/* Loading skeletons while fetching more */}
          {loading && renderLoadingSkeletons()}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="h-10 flex items-center justify-center mt-8"
          aria-label="Loading more confessions"
        >
          {loading && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          )}
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && confessions.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            You&apos;ve reached the end of confessions
          </p>
        </div>
      )}
    </div>
  );
};
