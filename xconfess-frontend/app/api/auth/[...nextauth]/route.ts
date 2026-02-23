/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * ⚠️  NextAuth is NOT used in this project.
 *
 * xConfess uses a custom JWT authentication strategy:
 *   - Tokens are issued by the NestJS backend (POST /auth/login)
 *   - Token storage and validation: see xconfess-frontend/app/lib/api/auth.ts
 *
 * This file exists only to prevent Next.js from throwing errors on
 * /api/auth/* requests that may be triggered by browser extensions
 * or misconfigured clients. It returns a 501 with a message.
 *
 * If NextAuth is adopted in the future, replace this file with:
 *   import NextAuth from "next-auth";
 *   const handler = NextAuth({ ... });
 *   export { handler as GET, handler as POST };
 */

import { NextResponse } from "next/server";

/**
 * Handles any GET or POST request to /api/auth/*.
 * Returns 501 Not Implemented — the route exists but NextAuth is not configured.
 */
function handler() {
  return NextResponse.json(
    {
      error: "Not Implemented",
      message:
        "xConfess uses custom JWT authentication via the NestJS backend. " +
        "See /app/lib/api/auth.ts for the active auth utilities.",
    },
    { status: 501 },
  );
}

export { handler as GET, handler as POST };
