import type { Role } from "@/types/api";

/** Where each role lands after login (TEAM_PLAN M2.3). */
export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "airline_moderator":
      return "/moderator/airline";
    case "hotel_moderator":
      return "/moderator/hotel";
    default:
      return "/";
  }
}

/** Login page that sends the user back to `nextPath` afterwards (ACC-10). */
export function loginUrl(nextPath?: string): string {
  return nextPath && isSafeNext(nextPath) ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
}

/** Only allow redirects to our own pages (no "//evil.com" or full URLs). */
export function isSafeNext(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login");
}
