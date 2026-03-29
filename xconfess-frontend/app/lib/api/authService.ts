import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from "@/app/lib/store/authStore";
import {
  AppError,
  getStatusMessage,
  getStatusCodeString,
  logError,
  LOGIN_ATTEMPT_FAILED_MESSAGE,
  toAppError
} from '@/app/lib/utils/errorHandler';
import {
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
  User,
} from '../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Axios instance for API calls
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Attach cookies for session-based auth
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
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      useAuthStore.getState().clearAuth();

      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API service
 */
export const authApi = {
  /**
   * Login user and establish session
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            : typeof rawApi === 'string' && rawApi.trim().length > 0
              ? rawApi
              : getStatusMessage(status);

        const code = getStatusCodeString(status);

        const apiError = new AppError(message, code, status, {
          responseBody: body,
          path: '/api/auth/session',
          upstreamMessage: typeof rawApi === 'string' ? rawApi : undefined,
        });

        logError(apiError, 'authApi.login', { status });
        throw apiError;
      }

      const data = await response.json();

      // ✅ Sync with your store (your branch logic preserved)
      useAuthStore.getState().setAuth(data.user);

      return data;
    } catch (error) {
      const appError =
        error instanceof AppError ? error : toAppError(error, 'Login failed');
      logError(appError, 'authApi.login');
      throw appError;
    }
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>('/users/register', data);
      return response.data;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : toAppError(error, 'Registration failed');
      logError(appError, 'authApi.register');
      throw appError;
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch('/api/auth/session');

      if (!response.ok) {
        const status = response.status;
        const message = getStatusMessage(status);
        const code = getStatusCodeString(status);

        const appError = new AppError(message, code, status, {
          path: '/api/auth/session',
          action: 'getCurrentUser',
        });

        logError(appError, 'authApi.getCurrentUser', { status });
        throw appError;
      }

      const data = await response.json();

      // ✅ Keep store in sync
      useAuthStore.getState().setAuth(data.user);

      return data.user;
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : toAppError(error, 'Failed to get user data');

      logError(appError, 'authApi.getCurrentUser');
      throw appError;
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } finally {
      // ✅ Preserve your branch behavior
      useAuthStore.getState().clearAuth();
    }
  },
};