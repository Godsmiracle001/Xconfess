"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuthStore } from "@/app/lib/store/authStore";
import { authApi } from "@/app/lib/api/authService";
import {
  AuthContextValue,
  LoginCredentials,
  RegisterData,
} from "@/app/lib/types/auth";
import { getErrorMessage } from "@/app/lib/utils/errorHandler";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    setUser,
    setLoading,
    setError,
    logout: storeLogout,
  } = useAuthStore();

  const hydrated = useRef(false);

  /**
   * 🔹 Initial session check (YOUR LOGIC — important)
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
          setUser(data.user);
        } else {
          storeLogout();
        }
      } catch {
        storeLogout();
      } finally {
        setLoading(false);
      }
    })();
  }, [setUser, storeLogout, setLoading]);

  /**
   * 🔹 Backend validation (main logic)
   */
  const checkAuth = async () => {
    try {
      setLoading(true);
      const user = await authApi.getCurrentUser();
      setUser(user);
    } catch {
      storeLogout();
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔹 Login
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.login(credentials);
      setUser(response.user);
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔹 Register
   */
  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      await authApi.register(data);

      // auto login
      await login({
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔹 Logout
   */
  const logout = () => {
    authApi.logout();
    storeLogout();
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);