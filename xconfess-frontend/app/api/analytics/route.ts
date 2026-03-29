import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/analytics`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { available: false, reason: "backend_error" },
        { status: 200 }
      );
    }

    const data = await res.json();

    // Return backend data exactly as-is — no estimates or invented comparisons
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { available: false, reason: "unavailable" },
      { status: 200 }
    );
  }
}
