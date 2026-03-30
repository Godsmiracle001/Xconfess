"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getConfessions } from "@/app/lib/api/confessions";
import type { GetConfessionsParams } from "@/app/lib/api/confessions";
import { queryKeys } from "@/app/lib/api/queryKeys";

const DEFAULT_LIMIT = 10;

export interface UseConfessionsQueryParams
  extends Omit<GetConfessionsParams, "page"> {
  limit?: number;
}

export function useConfessionsQuery(params: UseConfessionsQueryParams = {}) {
  const { limit = DEFAULT_LIMIT, ...rest } = params;

  return useInfiniteQuery({
    queryKey: queryKeys.confessions.list(rest),
    queryFn: async ({ pageParam }) => {
      const result = await getConfessions({
        page: pageParam,
        limit,
        ...rest,
      });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length + 1;
    },
  });
}
