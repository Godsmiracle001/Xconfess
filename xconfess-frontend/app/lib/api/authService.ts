import axios, { AxiosInstance, AxiosError } from "axios";
import {
  AppError,
  getStatusMessage,
  getStatusCodeString,
  logError,
  LOGIN_ATTEMPT_FAILED_MESSAGE,
  toAppError,
} from "@/app/lib/utils/errorHandler";
import {
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
  User,
} from "../types/auth";
import { useAuthStore } from "@/app/lib/store/authStore";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Attach credentials (cookies)
 */
apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Handle 401 globally
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});

      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }

      // Clear local auth state (your logic)
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

/**
 * Auth API Service (MERGED)
 */
export const authApi = {
  /**
   * Login (session-based + store sync)
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const status = response.status;

        const rawApi =
          (body && ((body as any).message || (body as any).error)) || null;

        const message =
          status === 401
            ? LOGIN_ATTEMPT_FAILED_MESSAGE
            : typeof rawApi === "string" && rawApi.trim().length > 0
            ? rawApi
            : getStatusMessage(status);

        const code = getStatusCodeString(status);

        const apiError = new AppError(message, code, status, {
          responseBody: body,
          path: "/api/auth/session",
        });

        logError(apiError, "authApi.login");
        throw apiError;
      }

      const data: LoginResponse = await response.json();

      // ✅ Sync with Zustand (your addition)
      if (data.user) {
        useAuthStore.getState().setAuth(data.user);
      }

      return data;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : toAppError(error, "Login failed");

      logError(appError, "authApi.login");
      throw appError;
    }
  },

  /**
   * Register
   */
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>(
        "/users/register",
        data
      );
      return response.data;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : toAppError(error, "Registration failed");

      logError(appError, "authApi.register");
      throw appError;
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch("/api/auth/session");

      if (!response.ok) {
        const status = response.status;
        const message = getStatusMessage(status);
        const code = getStatusCodeString(status);

        const appError = new AppError(message, code, status, {
          path: "/api/auth/session",
        });

        logError(appError, "authApi.getCurrentUser");
        throw appError;
      }

      const data = await response.json();

      // ✅ Keep store in sync
      if (data.user) {
        useAuthStore.getState().setAuth(data.user);
      }

      return data.user;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : toAppError(error, "Failed to get user data");

      logError(appError, "authApi.getCurrentUser");
      throw appError;
    }
  },

  /**
   * Logout (session + store cleanup)
   */
  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      // ✅ Always clear Zustand (your logic)
      useAuthStore.getState().clearAuth();
    }
  },
};