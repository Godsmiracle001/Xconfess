"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/app/lib/api/client";
import {
  AUTH_TOKEN_KEY,
  USER_DATA_KEY,
  ANONYMOUS_USER_ID_KEY,
} from "@/app/lib/api/constants";
import {
  validateLoginForm,
  parseLoginForm,
  hasErrors,
  type ValidationErrors,
} from "@/app/lib/utils/validation";

const showDevMockAdminLogin =
  process.env.NEXT_PUBLIC_ENABLE_DEV_MOCK_ADMIN_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  const doMockAdminLogin = async () => {
    setLoading(true);
    try {
      // Call session endpoint (main branch behavior)
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "mock",
          mock: true,
        }),
      });

      // Preserve your local mock storage behavior
      localStorage.setItem("adminMock", "true");
      localStorage.setItem(AUTH_TOKEN_KEY, "mock");
      localStorage.setItem(
        USER_DATA_KEY,
        JSON.stringify({
          id: 1,
          username: "demo-admin",
          isAdmin: true,
          is_active: true,
        })
      );

      router.push("/admin/dashboard");
    } catch {
      setErrors({ password: "Mock login failed" });
    } finally {
      setLoading(false);
    }
  };

  const doLogin = async () => {
    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) return;

    const parsed = parseLoginForm({ email, password });
    if (!parsed.success) {
      setErrors(parsed.errors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Use your real backend login
      const res = await apiClient.post("/api/users/login", {
        email: parsed.data.email,
        password: parsed.data.password,
      });

      const { access_token, user, anonymousUserId } = res.data ?? {};

      if (!access_token) {
        throw new Error("Missing access token");
      }

      // Persist auth (your logic)
      localStorage.setItem(AUTH_TOKEN_KEY, access_token);

      if (user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      }

      if (anonymousUserId) {
        localStorage.setItem(ANONYMOUS_USER_ID_KEY, anonymousUserId);
      }

      router.push("/admin/dashboard");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Login failed";
      setErrors({ password: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Login
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in with your account credentials.
          </p>
        </div>

        {errors.email && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {errors.email}
          </div>
        )}

        {errors.password && !errors.email && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {errors.password}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={doLogin}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {showDevMockAdminLogin && (
            <div className="pt-2 border-t border-dashed border-amber-600/50 dark:border-amber-500/40">
              <p className="text-xs text-amber-800 dark:text-amber-200/90 mb-2">
                Dev-only: mock admin shortcut (set{" "}
                <code className="font-mono">
                  NEXT_PUBLIC_ENABLE_DEV_MOCK_ADMIN_LOGIN=true
                </code>
                ). Do not enable in production.
              </p>
              <button
                type="button"
                onClick={doMockAdminLogin}
                disabled={loading}
                className="w-full bg-amber-700 text-white px-4 py-2 rounded-md hover:bg-amber-800 disabled:opacity-50 text-sm"
              >
                Mock Admin Login (local testing)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}