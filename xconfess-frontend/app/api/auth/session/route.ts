import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const sessionCookie = cookies().get("session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/auth/session`, {
      headers: { Cookie: `session=${sessionCookie.value}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ authenticated: false, user: null });
    const user = await res.json();
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
