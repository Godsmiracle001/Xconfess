'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/authService';
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from '../api/constants';
import {
  AuthContextValue,
  AuthState,
  LoginCredentials,
  RegisterData,
} from '../types/auth';
import { useAuthStore } from '../store/authStore';

/**
 * Auth Context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Manages global authentication state and provides auth methods
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const setStoreUser = useAuthStore((s) => s.setUser);
  const setStoreLoading = useAuthStore((s) => s.setLoading);
  const setStoreError = useAuthStore((s) => s.setError);
  const storeLogout = useAuthStore((s) => s.logout);

  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });




  /**
  * Check if user is authenticated by validating token with backend
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
    } catch (error) {
      // Not authenticated or session expired
      setStoreUser(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null, // Don't show error for initial check
      });
    }
  };

  //   Check authentication status on mount

  useEffect(() => {
    // Wrap async call in IIFE to avoid synchronous setState in effect
    (async () => {
      await checkAuth();
    })();
  }, []);

  //  Login user with credentials

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.login(credentials);

      // User data is now managed in the store and state
      // Token is in the HttpOnly cookie
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
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };


  //  * Register new user and auto-login


  const register = async (data: RegisterData): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await authApi.register(data);

      // Auto-login after successful registration
      await login({ email: data.email, password: data.password });
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
      throw error;
    }
  };


  // Logout user and clear auth data

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


//  Custom hook to use auth context
//  returns Auth context value
//  throws Error if used outside AuthProvider

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
