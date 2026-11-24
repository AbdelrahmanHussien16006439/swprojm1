"use client";

// Who is logged in, for Client Components (Member 1): const { user, loading, refresh, logout } = useAuth();
// The user is loaded in the browser (not in the root layout) so public pages can stay static/ISR.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { CurrentUser } from "@/types/api";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** Reload the user from GET /api/auth/me (call it after login or profile changes). */
  refresh: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<CurrentUser>("/auth/me", { redirectOn401: false });
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", undefined, { redirectOn401: false });
    } finally {
      setUser(null);
      router.push("/");
      router.refresh();
    }
  }, [router]);

  // Load the user once when the app opens.
  useEffect(() => {
    let cancelled = false;
    api
      .get<CurrentUser>("/auth/me", { redirectOn401: false })
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // ACC-08: a user with a temporary password must change it before doing anything else.
  useEffect(() => {
    if (user?.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
    }
  }, [user, pathname, router]);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
