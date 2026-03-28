"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/app/lib/store/authStore";

type AuthContextValue = {
  isAuthenticated: boolean;
  user: ReturnType<typeof useAuthStore>["user"];
};

const AuthContext = createContext<AuthContextValue>({ isAuthenticated: false, user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (data.authenticated && data.user) setAuth(data.user);
        else clearAuth();
      } catch {
        clearAuth();
      }
    })();
  }, [setAuth, clearAuth]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
