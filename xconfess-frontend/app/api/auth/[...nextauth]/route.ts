import { NextResponse } from 'next/server';

// NOTE: This project uses a custom JWT flow stored in localStorage.
// This route exists only to satisfy Next.js routing/build expectations.

export async function GET() {
  return NextResponse.json(
    { error: 'NextAuth is not configured for this app.' },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'NextAuth is not configured for this app.' },
    { status: 501 },
  );
}
