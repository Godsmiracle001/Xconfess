'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/app/lib/api/client';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/users/register', { username, email, password });
      router.push('/login');
    } catch (e: any) {
      setError(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              id="register-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="yourname"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button
            onClick={doRegister}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}
