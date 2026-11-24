"use client";

// Side menus for the admin and moderator dashboards (Member 1). Horizontal scroll strip on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface SidebarLink {
  href: string;
  label: string;
}

/** Admin pages and their owners (TEAM_PLAN M2.3). */
export const ADMIN_LINKS: SidebarLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/moderators", label: "Moderators" },
  { href: "/admin/airlines", label: "Airlines" },
  { href: "/admin/hotels", label: "Hotels" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/audit-logs", label: "Audit log" },
];

export function Sidebar({ title, links, exact = [] }: { title: string; links: SidebarLink[]; exact?: string[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    exact.includes(href) || href === links[0]?.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="md:w-56 md:shrink-0">
      <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-muted md:block">{title}</p>
      <nav className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:pb-0" aria-label={title}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
              isActive(l.href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-background hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

/** Layout body for dashboards: sidebar + content. */
export function DashboardShell({ title, links, children }: { title: string; links: SidebarLink[]; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <Sidebar title={title} links={links} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
