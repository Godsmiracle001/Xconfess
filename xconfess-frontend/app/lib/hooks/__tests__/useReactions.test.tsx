import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReactions } from '../useReactions';
import type { ReactionType, ReactionCounts } from '@/app/lib/types/reaction';

// Mock the addReaction API
jest.mock('@/app/lib/api/reactions', () => ({
  addReaction: jest.fn(),
}));

// Mock queryKeys
jest.mock('@/app/lib/api/queryKeys', () => ({
  queryKeys: {
    confessions: {
      all: ['confessions'],
      detail: (id: string) => ['confessions', 'detail', id],
    },
  },
}));

import { addReaction } from '@/app/lib/api/reactions';

const mockAddReaction = addReaction as jest.MockedFunction<typeof addReaction>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useReactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialCounts: ReactionCounts = { like: 5, love: 3 };

  it('should return initial state', () => {
    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.optimisticState).toBe(null);
  });

  it('should add reaction successfully', async () => {
    mockAddReaction.mockResolvedValue({
      ok: true,
      data: { success: true, reactions: { like: 6, love: 3 } },
    });

    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    let response: { ok: boolean; data?: { reactions?: ReactionCounts }; error?: { message: string } };
    
    await act(async () => {
      response = await result.current.addReaction('confession-123', 'like');
    });

    expect(response?.ok).toBe(true);
    expect(mockAddReaction).toHaveBeenCalledWith('confession-123', 'like');
  });

  it('should handle reaction error and rollback', async () => {
    mockAddReaction.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    let response: { ok: boolean; error?: { message: string; code: string } };
    
    await act(async () => {
      response = await result.current.addReaction('confession-123', 'like');
    });

    expect(response?.ok).toBe(false);
    expect(response?.error?.code).toBe('MUTATION_ERROR');
  });

  it('should set optimistic state on mutation', async () => {
    mockAddReaction.mockResolvedValue({
      ok: true,
      data: { success: true, reactions: { like: 6, love: 3 } },
    });

    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    // Trigger the mutation
    act(() => {
      result.current.addReaction('confession-123', 'like');
    });

    // Wait for optimistic state to be set
    await waitFor(() => {
      expect(result.current.optimisticState).not.toBe(null);
    });

    expect(result.current.optimisticState?.counts.like).toBe(6);
    expect(result.current.optimisticState?.userReaction).toBe('like');
  });

  it('should clear optimistic state after mutation settles', async () => {
    mockAddReaction.mockResolvedValue({
      ok: true,
      data: { success: true, reactions: { like: 6, love: 3 } },
    });

    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.addReaction('confession-123', 'like');
    });

    // After mutation settles, optimistic state should be cleared
    await waitFor(() => {
      expect(result.current.optimisticState).toBe(null);
    });
  });

  it('should remove reaction successfully', async () => {
    mockAddReaction.mockResolvedValue({
      ok: true,
      data: { success: true, reactions: { like: 4, love: 3 } },
    });

    const { result } = renderHook(
      () => useReactions({ 
        initialCounts,
        initialUserReaction: 'like' as ReactionType,
      }),
      { wrapper: createWrapper() }
    );

    let response: { ok: boolean };
    
    await act(async () => {
      response = await result.current.removeReaction('confession-123', 'like');
    });

    expect(response?.ok).toBe(true);
    expect(mockAddReaction).toHaveBeenCalledWith('confession-123', 'like');
  });

  it('should call onSuccess callback on successful reaction', async () => {
    const onSuccess = jest.fn();
    mockAddReaction.mockResolvedValue({
      ok: true,
      data: { success: true, reactions: { like: 6, love: 3 } },
    });

    const { result } = renderHook(
      () => useReactions({ 
        initialCounts,
        onSuccess,
      }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.addReaction('confession-123', 'like');
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should call onError callback on failed reaction', async () => {
    const onError = jest.fn();
    mockAddReaction.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useReactions({ 
        initialCounts,
        onError,
      }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.addReaction('confession-123', 'like');
    });

    expect(onError).toHaveBeenCalled();
  });

  it('should update optimistic counts directly', () => {
    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateOptimisticCounts({ like: 10, love: 5 });
    });

    expect(result.current.optimisticState?.counts.like).toBe(10);
    expect(result.current.optimisticState?.counts.love).toBe(5);
  });

  it('should clear optimistic state', () => {
    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    // Set some optimistic state
    act(() => {
      result.current.updateOptimisticCounts({ like: 10, love: 5 });
    });

    expect(result.current.optimisticState).not.toBe(null);

    // Clear it
    act(() => {
      result.current.clearOptimisticState();
    });

    expect(result.current.optimisticState).toBe(null);
  });

  it('should set error state', () => {
    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    const error = new Error('Test error');
    
    act(() => {
      result.current.setErrorState(error);
    });

    expect(result.current.error).toBe(error);
  });

  it('should handle isPending state during mutation', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: { ok: true; data: { success: true; reactions: ReactionCounts } }) => void;
    const promise = new Promise<{ ok: true; data: { success: true; reactions: ReactionCounts } }>((resolve) => {
      resolvePromise = resolve;
    });
    
    mockAddReaction.mockReturnValue(promise);

    const { result } = renderHook(
      () => useReactions({ initialCounts }),
      { wrapper: createWrapper() }
    );

    // Start mutation
    act(() => {
      result.current.addReaction('confession-123', 'like');
    });

    // Should be pending
    expect(result.current.isPending).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!({
        ok: true,
        data: { success: true, reactions: { like: 6, love: 3 } },
      });
      await promise;
    });

    // Should no longer be pending
    expect(result.current.isPending).toBe(false);
  });
});
