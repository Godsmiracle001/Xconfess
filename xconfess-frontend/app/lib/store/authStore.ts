import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AuthUser = { id: string; username: string; email: string };

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Core methods
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;

  // Backward compatibility (your branch)
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      /**
       * 🔹 Main setters (from main)
       */
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      setAuthenticated: (value) =>
        set({
          isAuthenticated: value,
          error: value ? null : undefined,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      /**
       * 🔹 Backward compatibility (your branch)
       */
      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
          error: null,
        }),

      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => sessionStorage),

      /**
       * 🔹 Only persist safe data
       */
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);