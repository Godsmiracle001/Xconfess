"use client";

import { useAuthContext } from '../providers/AuthProvider';
import { AuthContextValue } from '../types/auth';

/**
 * Custom hook for authentication
 * 
 * Provides access to authentication state and methods.
 * Must be used within an AuthProvider.
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * 
 * // Login
 * await login({ email: 'user@example.com', password: 'password' });
 * 
 * // Logout
 * logout();
 * 
 * // Check if authenticated
 * if (isAuthenticated) {
 *   console.log('User:', user);
 * }
 * ```
 * 
 * @returns Authentication context value with state and methods
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
import { useState } from "react";

type User = {
  username: string;
  email: string;
};

export function useAuth() {
  // TEMP mock (replace with real auth later)
  const [user, setUser] = useState<User | null>({
    username: "sudipta",
    email: "sudipta@example.com",
  });

  const logout = () => {
    setUser(null);
    console.log("Logged out");
    // later: clear token, redirect, etc.
  };

  return {
    user,
    logout,
  };
}
