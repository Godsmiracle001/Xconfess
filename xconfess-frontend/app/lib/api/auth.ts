/**
 * lib/api/auth.ts
 *
 * Custom JWT authentication utilities for xConfess frontend.
 *
 * Auth strategy: Custom JWT (no NextAuth).
 * - Tokens are issued by the NestJS backend at POST /auth/login
 * - Stored in localStorage under the key "xconfess_token"
 * - Attached to API requests via the Authorization header
 * - No login required for anonymous confession posting or reactions
 *
 * Security note: JWT is stored in localStorage which is accessible to
 * JavaScript. Ensure a strict Content Security Policy (CSP) is in place
 * and that no user-controlled HTML is rendered unsanitized. A future
 * improvement would be to use HttpOnly cookies set by the NestJS backend.
 *
 * Environment variable required:
 *   NEXT_PUBLIC_API_URL=http://localhost:5000
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ─── Token storage key ────────────────────────────────────────────────────────

const TOKEN_KEY = "xconfess_token";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  sub: string;       // user ID
  email?: string;
  iat: number;       // issued at (unix timestamp)
  exp: number;       // expiry (unix timestamp)
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * Saves the JWT access token to localStorage.
 * Only call this in browser context (not during SSR).
 */
export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Retrieves the stored JWT access token.
 * Returns null if not found or called during SSR.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Removes the stored JWT access token (logout).
 */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decodes the JWT payload without verifying the signature.
 * Handles base64url encoding (replaces - with +, _ with /) before decoding.
 * Signature verification is handled by the backend on every request.
 * Returns null if the token is missing or malformed.
 */
export function decodeToken(token: string): AuthTokenPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;

    // Convert base64url → standard base64 before decoding
    const base64 = base64Payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");

    const decoded = atob(base64);
    return JSON.parse(decoded) as AuthTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the stored token exists and has not expired.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload) return false;

  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 > Date.now();
}

/**
 * Returns the decoded payload of the current stored token,
 * or null if the user is not authenticated or token is expired.
 */
export function getCurrentUser(): AuthTokenPayload | null {
  const token = getToken();
  if (!token) return null;
  // Check expiry before returning — expired tokens return null
  if (!isAuthenticated()) return null;
  return decodeToken(token);
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

/**
 * Logs in with email and password.
 * On success, saves the token and returns the decoded payload.
 * Throws an error with the server message on failure.
 */
export async function login(credentials: LoginCredentials): Promise<AuthTokenPayload> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Login failed" }));
    throw new Error(error.message ?? "Login failed");
  }

  const data: AuthResponse = await response.json();
  saveToken(data.access_token);

  const payload = decodeToken(data.access_token);
  if (!payload) throw new Error("Invalid token received from server");

  return payload;
}

/**
 * Logs out the current user by removing the stored token.
 */
export function logout(): void {
  removeToken();
}

// ─── Authenticated fetch helper ───────────────────────────────────────────────

/**
 * A thin wrapper around fetch that automatically attaches the JWT token
 * to the Authorization header if the user is authenticated.
 *
 * Uses new Headers() to properly handle all HeadersInit types including
 * Headers instances, string[][], and plain objects. Callers can override
 * Content-Type (e.g. for FormData/multipart requests) by setting it
 * explicitly in options.headers.
 *
 * Usage:
 *   const data = await authFetch("/confessions", { method: "GET" });
 */
export async function authFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  // Use new Headers() to correctly merge all HeadersInit types
  const headers = new Headers(options.headers);

  // Only set Content-Type if the caller hasn't already set one
  // (allows FormData/multipart requests to work correctly)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, { ...options, headers });
}
