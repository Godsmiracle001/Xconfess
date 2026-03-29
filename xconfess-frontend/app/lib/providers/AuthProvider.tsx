"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { authApi } from "../api/authService";
import {
  AuthContextValue,
  AuthState,
  LoginCredentials,
  RegisterData,
} from "../types/auth";
import { useAuthStore } from "../store/authStore";
import { getErrorMessage } from "../utils/errorHandler";

/**
 * Context
 */
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  checkAuth: async () => {},
});

/**
 * Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const setStoreUser = useAuthStore((s) => s.setUser);
  const storeLogout = useAuthStore((s) => s.logout);

  const hydrated = useRef(false);

  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * 🔥 Initial hydration (from your branch)
   */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        const data = await res.json();

        if (data.authenticated && data.user) {
          setStoreUser(data.user);
          setState({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setStoreUser(null);
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } catch {
        setStoreUser(null);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    })();
  }, [setStoreUser]);

  /**
   * Check auth manually (main)
   */
  const checkAuth = async (): Promise<void> => {
    try {
      const user = await authApi.getCurrentUser();

      setStoreUser(user);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      setStoreUser(null);

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  /**
   * Login
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.login(credentials);

      setStoreUser(response.user);

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  };

  /**
   * Register
   */
  const register = async (data: RegisterData): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await authApi.register(data);

      // Auto-login
      await login({ email: data.email, password: data.password });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  };

  /**
   * Logout
   */
  const logout = (): void => {
    authApi.logout();
    storeLogout();

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook
 */
export const useAuth = () => useContext(AuthContext);