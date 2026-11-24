"use client";

// PLACEHOLDER created by Member 1 so the navbar compiles.
// OWNER: Member 6 (TEAM_PLAN M2.7) — replace this with the real bell: unread count + dropdown (GEN-01).
// Keep the same export name and no props: <NotificationBell />
import Link from "next/link";

export function NotificationBell() {
  return (
    <Link href="/notifications" aria-label="Notifications" className="rounded-md p-2 text-muted hover:bg-background hover:text-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
      </svg>
    </Link>
  );
}
