import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isSessionValueValid } from "@/lib/session";

// Next.js 16 renamed middleware.ts -> proxy.ts (same behavior), and the
// exported function itself must be named `proxy` (or be the default export).

/**
 * Site-wide staging gate (Milestone 1) — only active when both env vars are
 * set, which they never are in local dev or a future real production
 * deploy unless someone deliberately configures them there. Applies to
 * *every* route (not just /admin), per the staging requirement that no
 * real customer should ever reach the site. Plain HTTP Basic Auth: no new
 * UI, works before any of the app's own code runs, and every browser
 * caches the credentials for the origin after the first prompt.
 *
 * Uses atob (not Buffer) to decode the Authorization header — Edge-safe,
 * same "works in both the Node and Edge runtimes" reasoning as
 * src/lib/session.ts's HMAC signing.
 */
function isStagingAuthorized(request: NextRequest, user: string, pass: string): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice("Basic ".length));
    const sep = decoded.indexOf(":");
    if (sep === -1) return false;
    return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const stagingUser = process.env.STAGING_BASIC_AUTH_USER;
  const stagingPass = process.env.STAGING_BASIC_AUTH_PASSWORD;
  if (stagingUser && stagingPass && !isStagingAuthorized(request, stagingUser, stagingPass)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Shokakko Staging"' },
    });
  }

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const raw = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await isSessionValueValid(raw);
  if (!valid) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Runs on every route (needed for the staging gate above) except Next's own
// static/image internals, which don't need auth and would just be wasted
// invocations — the admin-session check inside still only applies under
// /admin, unaffected by this broader matcher.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
