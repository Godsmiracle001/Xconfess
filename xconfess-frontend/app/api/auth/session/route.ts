import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const SESSION_COOKIE_NAME = "xconfess_session";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

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

        // Set HttpOnly cookie with the access token
        cookies().set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });

        return NextResponse.json({ user: data.user });
    } catch (error) {
        return NextResponse.json(
            { message: "An unexpected error occurred during login" },
            { status: 500 }
        );
    }
}

export async function GET() {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
        // Bridges the session to the backend to get current user info
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            cookieStore.delete(SESSION_COOKIE_NAME);
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const user = await response.json();
        return NextResponse.json({ authenticated: true, user });
    } catch (error) {
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}

export async function DELETE() {
    cookies().delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true });
}
