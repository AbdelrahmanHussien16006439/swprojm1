// Admin overview (Member 1): one card per admin page. Dynamic SSR (protected by the admin layout).
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Admin" };

const sections = [
  { href: "/admin/accounts", emoji: "👥", title: "Accounts", text: "Search users and moderators, suspend, reactivate, reset passwords." },
  { href: "/admin/moderators", emoji: "🧑‍✈️", title: "Moderators", text: "Create an airline or hotel moderator account." },
  { href: "/admin/airlines", emoji: "✈️", title: "Airlines", text: "Create airlines and see all of them." },
  { href: "/admin/hotels", emoji: "🏨", title: "Hotels", text: "Create hotels and see all of them." },
  { href: "/admin/providers", emoji: "🔌", title: "Providers", text: "Deactivate or reactivate an airline or hotel." },
  { href: "/admin/bookings", emoji: "🎫", title: "Bookings", text: "Every flight and hotel booking, read-only." },
  { href: "/admin/reports", emoji: "🚩", title: "Reports", text: "Reported posts, comments, reviews and itineraries." },
  { href: "/admin/content", emoji: "🧹", title: "Content", text: "Hide, unhide or delete any content directly." },
  { href: "/admin/audit-logs", emoji: "📜", title: "Audit log", text: "Who did what, and when." },
];

export default function AdminHomePage() {
  return (
    <>
      <PageHeader eyebrow="🛡️ Admin" title="Control room" description="Everything you can manage on the platform." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-3xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-2xl" aria-hidden="true">
              {s.emoji}
            </span>
            <h2 className="mt-3 text-lg font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
