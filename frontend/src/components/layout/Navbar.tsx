"use client";

// Top navigation (Member 1, GEN-14). Links change with the role. On phones the links fold into a menu.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginUrl, roleHome } from "@/lib/auth/routes";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/api";

interface NavLink {
  href: string;
  label: string;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: "/flights", label: "Flights" },
  { href: "/hotels", label: "Hotels" },
  { href: "/explore", label: "Itineraries" },
  { href: "/blog", label: "Blog" },
];

function roleLinks(role: Role): NavLink[] {
  switch (role) {
    case "user":
      return [
        { href: "/itineraries", label: "My itineraries" },
        { href: "/my/flight-bookings", label: "My flights" },
        { href: "/my/hotel-bookings", label: "My stays" },
      ];
    case "admin":
      return [{ href: "/admin", label: "Admin" }];
    case "airline_moderator":
    case "hotel_moderator":
      return [{ href: roleHome(role), label: "Dashboard" }];
  }
}

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  // The phone menu remembers the page it was opened on, so it closes by itself after navigating.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;

  const links = [...PUBLIC_LINKS, ...(user ? roleLinks(user.role) : [])];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    cn(
      "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
      isActive(href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-background hover:text-foreground",
    );

  const account = loading ? null : user ? (
    <div className="flex items-center gap-1">
      <NotificationBell />
      <Link href="/profile" className={linkClass("/profile")}>
        {user.name}
      </Link>
      <button type="button" onClick={() => void logout()} className="rounded-md px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground">
        Log out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href={loginUrl(pathname === "/" ? undefined : pathname)} className={linkClass("/login")}>
        Log in
      </Link>
      <Link href="/register" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover">
        Sign up
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-lg font-semibold text-primary">
          TravelMate
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">{account}</div>

        <button
          type="button"
          className="rounded-md p-2 text-muted hover:bg-background lg:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
            <path d={menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-border pt-3">{account}</div>
        </div>
      )}
    </header>
  );
}
