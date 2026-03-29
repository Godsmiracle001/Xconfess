import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const BACKEND_URL = process.env.BACKEND_URL;
const SESSION_COOKIE_NAME = "xconfess_session";

/**
 * LOGIN (creates session cookie)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email : undefined;
    const password = typeof body?.password === "string" ? body.password : undefined;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      return NextResponse.json(
        { message: error.message ?? "Login failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const token = data.access_token;

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ user: data.user });
  } catch {
    return NextResponse.json(
      { message: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}

/**
 * GET CURRENT SESSION
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // 🔹 Fallback to legacy "session" cookie (your branch support)
  const legacySession = cookieStore.get("session")?.value;

  if (!token && !legacySession) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  try {
    // Prefer new token-based auth
    if (token) {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return NextResponse.json({ authenticated: true, user });
      }
    }

    // 🔹 Fallback to old backend session endpoint (your branch behavior)
    if (legacySession && BACKEND_URL) {
      const res = await fetch(`${BACKEND_URL}/auth/session`, {
        headers: { Cookie: `session=${legacySession}` },
        cache: "no-store",
      });

      if (res.ok) {
        const user = await res.json();
        return NextResponse.json({ authenticated: true, user });
      }
    }

    // If both fail → clear cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

/**
 * LOGOUT
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}