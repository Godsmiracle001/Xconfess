"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConfessionCard } from "./ConfessionCard";
import { SkeletonCard } from "./LoadingSkeleton";
import type { NormalizedConfession } from "../../lib/utils/normalizeConfession";

interface FetchResponse {
  confessions: NormalizedConfession[];
  hasMore: boolean;
  total?: number;
  page?: number;
}

interface ConfessionFeedProps {
  /** Increment this value to trigger a full feed refresh from page 1. */
  refreshTrigger?: number;
}

export const ConfessionFeed = ({ refreshTrigger = 0 }: ConfessionFeedProps) => {
  const [confessions, setConfessions] = useState<NormalizedConfession[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch confessions
  const fetchConfessions = useCallback(async (pageNum: number) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/confessions?page=${pageNum}&limit=10`,
        {
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch confessions: ${response.statusText}`);
      }

      const data: FetchResponse = await response.json();

      if (pageNum === 1) {
        setConfessions(data.confessions);
        setIsEmpty(data.confessions.length === 0);
      } else {
        setConfessions((prev) => [...prev, ...data.confessions]);
      }

      setHasMore(data.hasMore);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Ignore abort errors
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load confessions",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchConfessions(1);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchConfessions]);

  // Refetch from page 1 whenever refreshTrigger increments (e.g. after form submit)
  useEffect(() => {
    if (refreshTrigger === 0) return; // skip the initial mount value
    setPage(1);
    setConfessions([]);
    setHasMore(true);
    fetchConfessions(1);
  }, [refreshTrigger, fetchConfessions]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading && !error) {
          setPage((prev) => prev + 1);
        }
      },
      {
        rootMargin: "100px", // Start loading before reaching the bottom
        threshold: 0.1,
      },
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, isLoading, error]);

  // Fetch more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchConfessions(page);
    }
  }, [page, fetchConfessions]);

  // Handle retry
  const handleRetry = () => {
    setPage(1);
    fetchConfessions(1);
  };

  // Render loading skeleton
  const renderLoadingSkeletons = () => {
    return (
      <>
        {Array.from({ length: 3 }).map((_, idx) => (
          <SkeletonCard key={`skeleton-${idx}`} />
        ))}
      </>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Empty State */}
      {isEmpty && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">
            No confessions yet. Be the first to share!
          </p>
          <button
            onClick={() => {
              setPage(1);
              fetchConfessions(1);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Confessions Grid */}
      {!isEmpty && (
        <div className="space-y-4">
          {confessions.map((confession) => (
            <ConfessionCard
              key={confession.id}
              confession={confession}
            />
          ))}

          {/* Loading skeletons while fetching more */}
          {isLoading && page > 1 && renderLoadingSkeletons()}
        </div>
      )}

      {/* Initial loading state */}
      {isLoading && page === 1 && (
        <div className="space-y-4">{renderLoadingSkeletons()}</div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !error && (
        <div
          ref={observerTarget}
          className="h-10 flex items-center justify-center mt-8"
          aria-label="Loading more confessions"
        >
          {isLoading && page > 1 && (
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
