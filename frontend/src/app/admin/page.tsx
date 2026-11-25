// Admin overview (Member 1): one card per admin page. Dynamic SSR (protected by the admin layout).
import Link from "next/link";
import { Icon, PageHeader, type IconName } from "@/components/ui";

export const metadata = { title: "Admin" };

const sections: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: "/admin/accounts", icon: "users", title: "Accounts", text: "Search users and moderators, suspend, reactivate, reset passwords." },
  { href: "/admin/moderators", icon: "userPlus", title: "Moderators", text: "Create an airline or hotel moderator account." },
  { href: "/admin/airlines", icon: "plane", title: "Airlines", text: "Create airlines and see all of them." },
  { href: "/admin/hotels", icon: "hotel", title: "Hotels", text: "Create hotels and see all of them." },
  { href: "/admin/providers", icon: "power", title: "Providers", text: "Deactivate or reactivate an airline or hotel." },
  { href: "/admin/bookings", icon: "ticket", title: "Bookings", text: "Every flight and hotel booking, read-only." },
  { href: "/admin/reports", icon: "flag", title: "Reports", text: "Reported posts, comments, reviews and itineraries." },
  { href: "/admin/content", icon: "eyeOff", title: "Content", text: "Hide, unhide or delete any content directly." },
  { href: "/admin/audit-logs", icon: "file", title: "Audit log", text: "Who did what, and when." },
];

export default function AdminHomePage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Control room" description="Everything you can manage on the platform." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
              <Icon name={s.icon} />
            </span>
            <h2 className="mt-3 text-lg font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
