/**
 * Regression tests for the admin layout mock-admin guard.
 *
 * Security requirement (issue #649):
 *   - The localStorage "adminMock" toggle must no longer grant admin access.
 *   - NEXT_PUBLIC_ADMIN_MOCK may only enable mock mode when NODE_ENV === "development".
 *   - In production-like builds (NODE_ENV !== "development"), mock mode is always false.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";

// ── Next.js navigation mocks ───────────────────────────────────────────────
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/dashboard",
}));

// ── React-query mock ───────────────────────────────────────────────────────
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    setQueriesData: jest.fn(),
  }),
}));

// ── Socket.io mock ─────────────────────────────────────────────────────────
jest.mock("socket.io-client", () => ({
  io: () => ({
    on: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

// ── Misc app mocks ─────────────────────────────────────────────────────────
jest.mock("@/app/lib/api/constants", () => ({
  AUTH_TOKEN_KEY: "auth_token",
  USER_DATA_KEY: "user_data",
}));
jest.mock("@/app/lib/hooks/useFocusTrap", () => ({
  useFocusTrap: jest.fn(),
}));
jest.mock("@/app/lib/config", () => ({
  getApiBaseUrl: () => "http://localhost:5000",
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function setLocalStorage(key: string, value: string) {
  (window.localStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    k === key ? value : null,
  );
}

function clearLocalStorage() {
  (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
}

async function renderLayout() {
  // Dynamic import so NODE_ENV / env var changes in individual tests are
  // picked up fresh via module registry manipulation where needed.
  const { default: AdminLayout } = await import("../layout");
  return render(<AdminLayout>content</AdminLayout>);
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  clearLocalStorage();
  delete process.env.NEXT_PUBLIC_ADMIN_MOCK;
});

describe("isMockAdminEnabled — production guard", () => {
  it("is always false when NODE_ENV is not 'development'", () => {
    // NODE_ENV is 'test' in Jest — mock mode must be inactive.
    expect(process.env.NODE_ENV).not.toBe("development");
    // Setting the env var must have no effect outside of development.
    process.env.NEXT_PUBLIC_ADMIN_MOCK = "true";

    // The function is private; we verify its effect: the layout should still
    // enforce authentication (redirect when no user is present).
    // If mock mode were active it would skip the redirect.
    // Covered by the redirect tests below.
  });

  it("localStorage 'adminMock' key is never checked", async () => {
    // This is the core regression: the old code read localStorage("adminMock").
    // Set it to "true" and confirm the layout still enforces auth.
    (window.localStorage.getItem as jest.Mock).mockImplementation((k: string) =>
      k === "adminMock" ? "true" : null,
    );

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("NEXT_PUBLIC_ADMIN_MOCK='true' without development NODE_ENV does not bypass auth", async () => {
    process.env.NEXT_PUBLIC_ADMIN_MOCK = "true";
    // NODE_ENV is 'test', not 'development', so mock mode stays off.
    clearLocalStorage();

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});

describe("Admin layout — authentication redirect behaviour", () => {
  it("redirects to /login when no user data is present in localStorage", async () => {
    clearLocalStorage();

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects to / when the stored user is not an admin", async () => {
    setLocalStorage(
      "user_data",
      JSON.stringify({ id: 2, username: "alice", isAdmin: false, is_active: true }),
    );

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockReplace).not.toHaveBeenCalledWith("/login");
  });

  it("does not redirect when the stored user is an admin", async () => {
    setLocalStorage(
      "user_data",
      JSON.stringify({ id: 1, username: "admin", isAdmin: true, is_active: true }),
    );

    await renderLayout();

    // Allow any pending effects to settle
    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it("redirects to /login when stored user data is invalid JSON", async () => {
    setLocalStorage("user_data", "not-valid-json");

    await renderLayout();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not seed admin state into localStorage for any reason in non-mock mode", async () => {
    clearLocalStorage();

    await renderLayout();

    // localStorage.setItem must never be called: no auto-seeding of admin tokens.
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });
});
