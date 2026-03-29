import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const SESSION_COOKIE_NAME = "xconfess_session";

/**
 * LOGIN (main branch)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email : undefined;
    const password =
      typeof body?.password === "string" ? body.password : undefined;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Login failed" }));

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
      maxAge: 60 * 60 * 24 * 7, // 1 week
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
 * SESSION CHECK (MERGED LOGIC)
 */
export async function GET() {
  const cookieStore = await cookies();

  // 1️⃣ Try JWT cookie (main branch)
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return NextResponse.json({ authenticated: true, user });
      }

      // Invalid token → clear it
      cookieStore.delete(SESSION_COOKIE_NAME);
    } catch {
      // fall through to legacy session
    }
  }

  // 2️⃣ Fallback to session cookie (your branch)
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${process.env.BACKEND_URL}/auth/session`, {
      headers: {
        Cookie: `session=${sessionCookie.value}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    const user = await res.json();
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}

/**
 * LOGOUT (main branch)
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ success: true });
}