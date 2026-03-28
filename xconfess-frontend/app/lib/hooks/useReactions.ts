"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addReaction, type AddReactionResponse } from "@/app/lib/api/reactions";
import type { ReactionType, ReactionCounts } from "@/app/lib/types/reaction";
import { queryKeys } from "@/app/lib/api/queryKeys";

export interface ReactionState {
  counts: ReactionCounts;
  userReaction: ReactionType | null;
}

export interface UseReactionsOptions {
  /**
   * Initial reaction counts for the confession
   */
  initialCounts?: ReactionCounts;
  /**
   * Initial user reaction state
   */
  initialUserReaction?: ReactionType | null;
  /**
   * Callback when reaction is successfully added
   */
  onSuccess?: (result: AddReactionResponse) => void;
  /**
   * Callback when reaction addition fails
   */
  onError?: (error: Error | AddReactionResponse) => void;
}

export interface UseReactionsReturn {
  /**
   * Add a reaction with optimistic update
   */
  addReaction: (confessionId: string, type: ReactionType) => Promise<AddReactionResponse>;
  /**
   * Remove a reaction (toggle off)
   */
  removeReaction: (confessionId: string, type: ReactionType) => Promise<AddReactionResponse>;
  /**
   * Whether a mutation is in progress
   */
  isPending: boolean;
  /**
   * Whether there's an error
   */
  isError: boolean;
  /**
   * The error if any
   */
  error: Error | null;
  /**
   * Optimistic state for immediate UI updates
   */
  optimisticState: ReactionState | null;
  /**
   * Clear optimistic state (rollback)
   */
  clearOptimisticState: () => void;
  /**
   * Update optimistic counts directly
   */
  updateOptimisticCounts: (counts: ReactionCounts) => void;
  /**
   * Set error state for external handling
   */
  setErrorState: (error: Error | null) => void;
}

/**
 * Hook for managing reactions with optimistic updates and rollback.
 * 
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Cache invalidation after successful mutation
 * - Exposed state for testing and debugging
 */
export function useReactions(options: UseReactionsOptions = {}): UseReactionsReturn {
  const { initialCounts, initialUserReaction, onSuccess, onError } = options;
  const queryClient = useQueryClient();
  
  // Local state for optimistic UI updates (complements React Query cache)
  const [optimisticState, setOptimisticState] = useState<ReactionState | null>(null);
  const [localError, setLocalError] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      confessionId,
      type,
      isRemoval,
    }: {
      confessionId: string;
      type: ReactionType;
      isRemoval?: boolean;
    }) => addReaction(confessionId, type),

    // Called before the mutation function
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.confessions.all });
      await queryClient.cancelQueries({
        queryKey: queryKeys.confessions.detail(variables.confessionId),
      });

      // Snapshot the previous values
      const previousConfessions = queryClient.getQueryData(queryKeys.confessions.all);
      const previousConfessionDetail = queryClient.getQueryData(
        queryKeys.confessions.detail(variables.confessionId)
      );

      // Optimistically update the cache
      const updateReactions = (counts: ReactionCounts): ReactionCounts => {
        const delta = variables.isRemoval ? -1 : 1;
        return {
          ...counts,
          [variables.type]: Math.max(0, (counts[variables.type] || 0) + delta),
        };
      };

      // Update list query
      queryClient.setQueryData(queryKeys.confessions.all, (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((confession: Record<string, unknown>) => {
          if (confession.id === variables.confessionId) {
            return {
              ...confession,
              reactions: updateReactions(confession.reactions as ReactionCounts || { like: 0, love: 0 }),
            };
          }
          return confession;
        });
      });

      // Update detail query
      queryClient.setQueryData(
        queryKeys.confessions.detail(variables.confessionId),
        (old: unknown) => {
          if (!old) return old;
          const data = old as Record<string, unknown>;
          return {
            ...data,
            reactions: updateReactions(data.reactions as ReactionCounts || { like: 0, love: 0 }),
          };
        }
      );

      // Set optimistic state for hook consumers
      const newCounts = initialCounts 
        ? updateReactions(initialCounts) 
        : { like: 0, love: 0 };
      
      setOptimisticState({
        counts: newCounts,
        userReaction: variables.isRemoval ? null : variables.type,
      });
      
      setLocalError(null);

      // Return context with previous values for rollback
      return {
        previousConfessions,
        previousConfessionDetail,
        variables,
      };
    },

    // Called if mutation fails
    onError: (error, variables, context) => {
      // Rollback to previous values
      if (context?.previousConfessions) {
        queryClient.setQueryData(queryKeys.confessions.all, context.previousConfessions);
      }
      if (context?.previousConfessionDetail) {
        queryClient.setQueryData(
          queryKeys.confessions.detail(variables.confessionId),
          context.previousConfessionDetail
        );
      }

      // Clear optimistic state
      setOptimisticState(null);
      
      // Set error state
      setLocalError(error as Error);

      // Call error callback
      if (onError) {
        onError(error as Error);
      }
    },

    // Called after mutation settles (success or error)
    onSettled: (_data, _error, variables) => {
      // Invalidate queries to refetch from server
      queryClient.invalidateQueries({ queryKey: queryKeys.confessions.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.confessions.detail(variables.confessionId),
      });

      // Clear optimistic state after invalidation (keep for a moment for smooth UI)
      setTimeout(() => {
        setOptimisticState(null);
      }, 100);
    },
  });

  const handleAddReaction = useCallback(async (
    confessionId: string,
    type: ReactionType
  ): Promise<AddReactionResponse> => {
    try {
      const result = await mutation.mutateAsync({ confessionId, type, isRemoval: false });
      
      if (result.ok && onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      // Error is already handled in onError callback
      return {
        ok: false,
        error: { 
          message: error instanceof Error ? error.message : "Failed to add reaction",
          code: "MUTATION_ERROR"
        },
      };
    }
  }, [mutation, onSuccess]);

  const handleRemoveReaction = useCallback(async (
    confessionId: string,
    type: ReactionType
  ): Promise<AddReactionResponse> => {
    try {
      const result = await mutation.mutateAsync({ confessionId, type, isRemoval: true });
      
      if (result.ok && onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      return {
        ok: false,
        error: { 
          message: error instanceof Error ? error.message : "Failed to remove reaction",
          code: "MUTATION_ERROR"
        },
      };
    }
  }, [mutation, onSuccess]);

  const clearOptimisticState = useCallback(() => {
    setOptimisticState(null);
    setLocalError(null);
  }, []);

  const updateOptimisticCounts = useCallback((counts: ReactionCounts) => {
    setOptimisticState((prev) => {
      if (!prev) {
        return {
          counts,
          userReaction: initialUserReaction || null,
        };
      }
      return {
        ...prev,
        counts,
      };
    });
  }, [initialUserReaction]);

  const setErrorState = useCallback((error: Error | null) => {
    setLocalError(error);
  }, []);

  return {
    addReaction: handleAddReaction,
    removeReaction: handleRemoveReaction,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: localError || mutation.error,
    optimisticState,
    clearOptimisticState,
    updateOptimisticCounts,
    setErrorState,
  };
}
