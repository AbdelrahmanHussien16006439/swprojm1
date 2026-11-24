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

interface NavLink {
  href: string;
  label: string;
  emoji: string;
}

const PUBLIC_LINKS: NavLink[] = [
  { href: "/flights", label: "Flights", emoji: "✈️" },
  { href: "/hotels", label: "Hotels", emoji: "🏨" },
  { href: "/explore", label: "Itineraries", emoji: "🗺️" },
  { href: "/blog", label: "Blog", emoji: "📝" },
];

function roleLinks(role: Role): NavLink[] {
  switch (role) {
    case "user":
      return [
        { href: "/itineraries", label: "My trips", emoji: "🧭" },
        { href: "/my/flight-bookings", label: "My flights", emoji: "🎫" },
        { href: "/my/hotel-bookings", label: "My stays", emoji: "🛏️" },
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
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
      isActive(href) ? "bg-foreground text-white shadow" : "text-muted hover:bg-primary-soft hover:text-primary",
    );

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const account = loading ? (
    <div className="h-10 w-28 animate-pulse rounded-full bg-primary-soft" />
  ) : user ? (
    <div className="flex items-center gap-2">
      <NotificationBell />
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-4 text-sm font-semibold shadow-sm transition hover:border-primary/40"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials}</span>
        <span className="max-w-32 truncate">{user.name.split(" ")[0]}</span>
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-danger-soft hover:text-danger"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href={loginUrl(pathname === "/" ? undefined : pathname)} className="rounded-full px-4 py-2 text-sm font-semibold text-foreground hover:bg-primary-soft">
        Log in
      </Link>
      <Link
        href="/register"
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5"
      >
        Join free ✨
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto max-w-6xl rounded-full border border-white/60 bg-white/70 shadow-[0_8px_30px_-12px_rgba(26,18,48,0.25)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 pl-5 pr-3">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-lg shadow-md" aria-hidden="true">
              ✈️
            </span>
            <span className="text-brand">TravelMate</span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:block">{account}</div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-white lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <path d={menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h10M4 17h16"} />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-border bg-surface p-4 shadow-xl lg:hidden">
          <nav className="grid grid-cols-2 gap-2" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
                  isActive(l.href) ? "bg-foreground text-white" : "bg-background hover:bg-primary-soft hover:text-primary",
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
