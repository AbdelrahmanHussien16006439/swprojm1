"use client";

// Top navigation (Member 1, GEN-14). Links change with the role. On phones and tablets the links fold into a menu.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginUrl, roleHome } from "@/lib/auth/routes";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/api";
import { Logo } from "./Logo";

interface NavLink {
  href: string;
  label: string;
  emoji: string;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: "/hotels", label: "Stays", emoji: "🏨" },
  { href: "/flights", label: "Flights", emoji: "✈️" },
  { href: "/explore", label: "Trip ideas", emoji: "🗺️" },
  { href: "/blog", label: "Stories", emoji: "📝" },
];

function roleLinks(role: Role): NavLink[] {
  switch (role) {
    case "user":
      return [
        { href: "/itineraries", label: "My trips", emoji: "🧭" },
        { href: "/my/flight-bookings", label: "Bookings", emoji: "🎫" },
      ];
    case "admin":
      return [{ href: "/admin", label: "Admin", emoji: "🛡️" }];
    case "airline_moderator":
    case "hotel_moderator":
      return [{ href: roleHome(role), label: "Dashboard", emoji: "📊" }];
  }
}

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  // The phone menu remembers the page it was opened on, so it closes by itself after navigating.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;

  const links = [...PUBLIC_LINKS, ...(user ? roleLinks(user.role) : [])];
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) || (href === "/my/flight-bookings" && pathname.startsWith("/my/"));

  const linkClass = (href: string) =>
    cn(
      "relative inline-flex h-16 items-center whitespace-nowrap px-3 text-sm font-semibold transition-colors",
      "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
      isActive(href) ? "text-primary after:bg-primary" : "text-foreground/80 after:bg-transparent hover:text-primary",
    );

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const account = loading ? (
    <div className="h-9 w-24 animate-pulse rounded-full bg-background" />
  ) : user ? (
    <div className="flex items-center gap-1.5">
      <NotificationBell />
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition hover:bg-background"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{initials}</span>
        <span className="max-w-28 truncate">{user.name.split(" ")[0]}</span>
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href={loginUrl(pathname === "/" ? undefined : pathname)} className="rounded-full px-4 py-2 text-sm font-semibold text-foreground hover:bg-background">
        Sign in
      </Link>
      <Link href="/register" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover">
        Create account
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Logo />

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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d={menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-surface px-4 pb-4 pt-3 shadow-lg lg:hidden">
          <nav className="grid grid-cols-2 gap-2" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
                  isActive(l.href) ? "bg-primary-soft text-primary" : "bg-background hover:bg-primary-soft hover:text-primary",
                )}
              >
                <span aria-hidden="true">{l.emoji}</span>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-border pt-4">{account}</div>
        </div>
      )}
    </header>
  );
}
