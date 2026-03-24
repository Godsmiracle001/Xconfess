"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchConfession } from "@/app/lib/types/search";
import type { SearchFilters } from "@/app/lib/types/search";

interface UseSearchOptions {
  query: string;
  filters: SearchFilters;
  debouncedQuery: string;
  runSearch: boolean;
}

interface UseSearchResult {
  results: SearchConfession[];
  total: number;
  hasMore: boolean;
  page: number;
  isLoading: boolean;
  error: string | null;
  statusMeta: {
    partial: boolean;
    degraded: boolean;
    message: string | null;
    warnings: string[];
    searchType?: string;
  } | null;
  loadMore: () => void;
  reset: () => void;
  retry: () => void;
}

function searchKey(q: string, f: SearchFilters): string {
  return [
    q,
    f.sort,
    f.dateFrom ?? "",
    f.dateTo ?? "",
    f.minReactions ?? "",
    f.gender ?? "",
  ].join("|");
}

export function useSearch({
  query,
  filters,
  debouncedQuery,
  runSearch,
}: UseSearchOptions): UseSearchResult {
  const [results, setResults] = useState<SearchConfession[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMeta, setStatusMeta] = useState<UseSearchResult["statusMeta"]>(null);
  const [retryTick, setRetryTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef<SearchConfession[]>([]);
  const keyRef = useRef<string>("");

  const currentKey = searchKey(debouncedQuery, filters);

  useEffect(() => {
    if (!runSearch) return;
    if (currentKey === keyRef.current) return;
    keyRef.current = currentKey;
    setPage(1);
    accumulatedRef.current = [];
  }, [runSearch, currentKey]);

  useEffect(() => {
    if (!runSearch) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setPage(1);
      setError(null);
      setStatusMeta(null);
      accumulatedRef.current = [];
      keyRef.current = "";
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const append = page > 1;

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");
    params.set("sort", filters.sort);
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.minReactions != null && filters.minReactions > 0) {
      params.set("minReactions", String(filters.minReactions));
    }
    if (filters.gender) params.set("gender", filters.gender);

    if (page === 1) accumulatedRef.current = [];
    setIsLoading(true);
    setError(null);

    fetch(`/api/confessions/search?${params}`, {
      signal: abortRef.current.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        const list = data.confessions ?? [];
        const totalCount = data.total ?? 0;
        const more = data.hasMore === true;
        const warnings = Array.isArray(data.warnings)
          ? data.warnings.filter(
              (entry: unknown) =>
                typeof entry === "string" && entry.trim().length > 0
            )
          : [];
        const partial = Boolean(data.partial);
        const degraded = Boolean(data.degraded);
        const message =
          typeof data.message === "string" && data.message.trim().length > 0
            ? data.message
            : null;
        const searchType =
          typeof data.meta?.searchType === "string"
            ? data.meta.searchType
            : undefined;

        if (append) {
          accumulatedRef.current = [...accumulatedRef.current, ...list];
        } else {
          accumulatedRef.current = list;
        }

        setResults([...accumulatedRef.current]);
        setTotal(totalCount);
        setHasMore(more);
        setStatusMeta(
          partial || degraded || warnings.length > 0 || message
            ? {
                partial,
                degraded,
                message,
                warnings,
                searchType,
              }
            : null
        );
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Search failed");
        setStatusMeta(
          append
            ? {
                partial: false,
                degraded: true,
                message:
                  e instanceof Error
                    ? e.message
                    : "Some results may be missing. Retry to refresh the list.",
                warnings: [],
                searchType: "error",
              }
            : null
        );
        if (page === 1) {
          setResults([]);
          setTotal(0);
          setHasMore(false);
          accumulatedRef.current = [];
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => abortRef.current?.abort();
  }, [runSearch, page, debouncedQuery, filters, retryTick]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    setPage((p) => p + 1);
  }, [hasMore, isLoading]);

  const reset = useCallback(() => {
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setPage(1);
    setError(null);
    setStatusMeta(null);
    accumulatedRef.current = [];
    keyRef.current = "";
  }, []);

  const retry = useCallback(() => {
    if (!runSearch) return;
    setRetryTick((tick) => tick + 1);
  }, [runSearch]);

  return {
    results,
    total,
    hasMore,
    page,
    isLoading,
    error,
    statusMeta,
    loadMore,
    reset,
    retry,
  };
}
