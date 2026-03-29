import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AuthUser = { id: string; username: string; email: string };

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      setAuthenticated: (value) =>
        set({ isAuthenticated: value, error: value ? null : undefined }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      hydrateFromStorage: () => {
        // Hydration from localStorage is disabled for security
        // State will be populated by AuthProvider from session cookie
        if (typeof window === "undefined") return;
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
