/**
 * Centralized query keys for React Query cache management
 */

export const queryKeys = {
  confessions: {
    all: ["confessions"] as const,
    list: (params?: Record<string, unknown>) =>
      ["confessions", "list", params ?? {}] as const,
    detail: (id: string) => ["confessions", "detail", id] as const,
  },
} as const;
