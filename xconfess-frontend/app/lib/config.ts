/**
 * Canonical Backend URL Resolution
 * Server-side: Uses BACKEND_API_URL (private)
 * Client-side: Uses NEXT_PUBLIC_API_URL (public)
 */

export const getApiBaseUrl = (): string => {
  // 1. Server-side check
  if (typeof window === 'undefined') {
    const serverUrl = process.env.BACKEND_API_URL;
    if (!serverUrl) {
      throw new Error("Missing BACKEND_API_URL environment variable on server.");
    }
    return serverUrl;
  }

  // 2. Client-side check
  const clientUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!clientUrl) {
    // We avoid hardcoded localhost fallbacks here to fail fast in dev/preview
    throw new Error("Missing NEXT_PUBLIC_API_URL environment variable on client.");
  }
  return clientUrl;
};

/**
 * Canonical WebSocket URL Resolution
 * Client-side: Uses NEXT_PUBLIC_WS_URL (public)
 */
export const getWsUrl = (): string => {
  if (typeof window === 'undefined') {
    throw new Error("WebSocket URL is only available on client-side.");
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (!wsUrl) {
    throw new Error("Missing NEXT_PUBLIC_WS_URL environment variable on client.");
  }
  return wsUrl;
};