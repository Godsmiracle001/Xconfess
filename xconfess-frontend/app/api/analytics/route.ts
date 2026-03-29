import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    const res = await fetch(`${process.env.BACKEND_URL}/analytics`, {
      cache: "no-store",
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    if (!res.ok) {
      return NextResponse.json(
        { available: false, reason: "backend_error" },
        { status: 200 }
      );
    }

    const data = await res.json();

    // ✅ Preserve your intent: no estimation, no transformation
    return NextResponse.json(data);
  } catch (error) {
    console.error("Analytics Fetch Error:", error);

    return NextResponse.json(
      { available: false, reason: "unavailable" },
      { status: 200 }
    );
  }
}