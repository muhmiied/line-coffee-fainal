import { NextResponse, type NextRequest } from "next/server";

// Edge gate for the admin area.
//
// IMPORTANT — this is a UX/defense-in-depth redirect, NOT the security boundary.
// The Supabase session lives in localStorage (see src/lib/supabase/client.ts:
// persistSession=true, default storage), which the Edge middleware cannot read.
// The authoritative gates remain:
//   1. Row Level Security (`is_admin()`) on every admin table/RPC — a signed-out
//      or non-admin request can read/write nothing regardless of the URL.
//   2. The client-side AdminShell, which resolves the real admin_users row and
//      renders an access-denied / redirect screen for non-admins.
//
// To still give signed-out visitors a clean server-side redirect (instead of a
// flash of the admin shell), `useAuth` mirrors "a session exists" into a
// non-sensitive presence cookie (`line-auth`). It carries no token and is
// spoofable, so it is treated as a hint only — never as proof of admin rights.
const ADMIN_PRESENCE_COOKIE = "line-auth";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.get(ADMIN_PRESENCE_COOKIE)?.value === "1";

  if (!hasSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on admin routes. Everything else is public and skips the middleware.
  matcher: ["/admin/:path*"],
};
