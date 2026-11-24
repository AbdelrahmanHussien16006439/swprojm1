// Route protection + session refresh (Member 1, TEAM_PLAN M2.4). Runs before every page.
// Next.js 16 renamed middleware.ts to proxy.ts.
// This only decides where to SEND the user. The backend still checks login and roles on every request.
import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

/** Pages that need a logged-in user (ACC-10). Role checks happen in the admin/moderator layouts. */
const PROTECTED_PREFIXES = [
  "/profile",
  "/change-password",
  "/my",
  "/book",
  "/itineraries",
  "/notifications",
  "/blog/new",
  "/blog/mine",
  "/admin",
  "/moderator",
];

function isProtected(pathname: string): boolean {
  if (/^\/blog\/[^/]+\/edit$/.test(pathname)) return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // Let server components know the current URL (used by requireRole for ?next=).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname + search);

  // The 15-minute access cookie expired but the session may still be alive: refresh it (ACC-19).
  if (!hasAccess && refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (refreshed) {
      // Make this request see the new cookies, and send them to the browser.
      requestHeaders.set("cookie", mergeCookies(request.headers.get("cookie"), refreshed.values));
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      refreshed.setCookieHeaders.forEach((c) => response.headers.append("set-cookie", c));
      return response;
    }
  }

  if (!hasAccess && isProtected(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    const response = NextResponse.redirect(login);
    if (refreshToken) response.cookies.delete(REFRESH_COOKIE); // the session is over
    return response;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function refreshSession(refreshToken: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const setCookieHeaders = res.headers.getSetCookie();
    const values: Record<string, string> = {};
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      const index = pair.indexOf("=");
      values[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
    }
    return values[ACCESS_COOKIE] ? { setCookieHeaders, values } : null;
  } catch {
    return null; // backend down: treat as logged out
  }
}

function mergeCookies(original: string | null, updates: Record<string, string>): string {
  const jar = new Map<string, string>();
  for (const part of (original ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) jar.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  for (const [name, value] of Object.entries(updates)) jar.set(name, value);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

export const config = {
  // Run on pages only: not on /api (forwarded to the backend), uploads, Next.js files or images.
  matcher: ["/((?!api|uploads|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
