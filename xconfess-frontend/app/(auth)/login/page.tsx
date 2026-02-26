'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/app/lib/api/client';
import { AUTH_TOKEN_KEY, USER_DATA_KEY, ANONYMOUS_USER_ID_KEY } from '@/app/lib/api/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doMockAdminLogin = async () => {
    setLoading(true);
    try {
      // Establish a session via the proxy with mock signals
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'mock', mock: true }),
      });
      router.push('/admin/dashboard');
    } catch (e: any) {
      setError('Mock login failed');
    } finally {
      setLoading(false);
    }
  };

  const doLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      router.push('/admin/dashboard');
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For quick testing, use <span className="font-medium">Mock Admin Login</span>.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={doLogin}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={doMockAdminLogin}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800"
            >
              Mock Admin Login (Dummy Data)
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This enables local mock data for admin endpoints (analytics, reports, users, audit logs).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
