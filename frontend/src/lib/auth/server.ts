// Auth helpers for Server Components (Member 1). They read the login cookies, so a page or
// layout that uses them is rendered per request (SSR). Never use them on ISR pages.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, serverApi } from "@/lib/api/server";
import type { CurrentUser, Role } from "@/types/api";
import { loginUrl } from "./routes";

/** The logged-in user, or null for guests. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await serverApi.get<CurrentUser>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

/**
 * Use at the top of a protected layout/page:
 *   const user = await requireRole("admin");
 * Guests go to /login?next=..., wrong roles go to /forbidden. Navigation only: the backend
 * still checks the role on every request.
 */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get("x-pathname") ?? "/";
    redirect(loginUrl(path));
  }
  if (user.mustChangePassword) redirect("/change-password");
  if (roles.length && !roles.includes(user.role)) redirect("/forbidden");
  return user;
}
