import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "xconfess_session";

// Routes that require admin role
const ADMIN_ROUTES = ["/admin", "/admin/templates", "/admin/notifications"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the route is an admin route
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

    if (isAdminRoute) {
        const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        try {
            // Decode the token to check for the role
            // Since middleware can't easily use external libraries without bundle size issues,
            // and we want it to be fast, we can do a simple base64 decode of the payload.
            const payloadBase64 = token.split(".")[1];
            if (!payloadBase64) {
                throw new Error("Invalid token");
            }

            // Use atob for Edge Runtime compatibility
            const decoded = atob(payloadBase664.replace(/-/g, "+").replace(/_/g, "/"));
            const payload = JSON.parse(decoded);

            // Backend JwtStrategy returns 'role'
            if (payload.role !== "admin") {
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }
        } catch (error) {
            console.error("Middleware auth error:", error);
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
