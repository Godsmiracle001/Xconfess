import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  LoginCredentials,
  LoginResponse,
  RegisterData,
  RegisterResponse,
  User,
} from '../types/auth';
import { AUTH_TOKEN_KEY, USER_DATA_KEY, ANONYMOUS_USER_ID_KEY } from './constants';

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
 * Request interceptor to add JWT token to headers if available (for backend calls)
 * Note: In session mode, cookies are handled by the browser, but we might still
 * need to proxy tokens if the backend requires explicitly. 
 * However, the new strategy is to let the /api proxy handle this.
 */
apiClient.interceptors.request.use(
  (config) => {
    // We no longer read from localStorage. 
    // If we're calling the backend directly from the client, we rely on cookies being sent
    // or we'll need a different mechanism. For now, we prefer proxying through /api.
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor to handle 401 errors (token expiration)
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session expired or invalid
      // We'll trigger a logout on the session API to be sure
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => { });

      // Redirect to login if not already there
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
   * @param credentials - Email and password
   * @returns Login response with user data
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return await response.json();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Login failed');
    }
  },

  /**
   * Register new user
   * @param data - Registration data (email, password, username)
   * @returns Registered user data
   */
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>('/users/register', data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Registration failed');
      }
      throw new Error('Network error. Please check your connection.');
    }
  },

  /**
   * Get current authenticated user from session
   * @returns Current user data
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      const data = await response.json();
      return data.user;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get user data');
    }
  },

  /**
   * Logout user (clears session cookie)
   */
  async logout(): Promise<void> {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => { });
  },
};

export default apiClient;
