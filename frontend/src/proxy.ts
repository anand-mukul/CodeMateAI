import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Proxy & Network Boundary Convention (proxy.ts)
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *
 * Runs before requests are completed to handle:
 * 1. Rewriting /portal to /dashboard
 * 2. Reverse proxying /api/:path* to the backend service
 * 3. Enforcing production security headers
 */

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://codemate-backend-wsi1.onrender.com"
).replace(/\/$/, "");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Rewrite legacy /portal to modern /dashboard
  if (pathname === "/portal" || pathname === "/portal/") {
    return NextResponse.rewrite(new URL(`/dashboard${search}`, request.url));
  }

  // 2. Reverse proxy /api calls to backend (resolves CORS and enables unified origin)
  if (pathname.startsWith("/api/")) {
    const targetUrl = new URL(`${pathname}${search}`, BACKEND_URL);
    return NextResponse.rewrite(targetUrl, {
      request: {
        headers: new Headers(request.headers),
      },
    });
  }

  // 3. Security response headers for web workspace pages
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/portal",
    "/portal/:path*",
    "/api/:path*",
    "/dashboard/:path*",
  ],
};

