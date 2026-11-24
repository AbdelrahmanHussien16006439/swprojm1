// Pagination and Tabs (Member 1). Both are plain links, so they work in Server Components (SSR pages)
// and keep the state in the URL (?page=2, ?group=past) — the back button works (GEN-14).
import Link from "next/link";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Current URL path, e.g. "/blog". */
  basePath: string;
  /** Current search params (filters stay when changing page). */
  searchParams?: Record<string, string | string[] | undefined>;
}

/** <Pagination page={data.page} totalPages={data.totalPages} basePath="/blog" searchParams={sp} /> (GEN-05) */
export function Pagination({ page, totalPages, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const link = "inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary";
  const disabled = "pointer-events-none opacity-50";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-2">
      <Link href={href(page - 1)} className={cn(link, page <= 1 && disabled)} aria-disabled={page <= 1}>
        ← Previous
      </Link>
      <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
        Page {page} of {totalPages}
      </span>
      <Link href={href(page + 1)} className={cn(link, page >= totalPages && disabled)} aria-disabled={page >= totalPages}>
        Next →
      </Link>
    </nav>
  );
}

interface Tab {
  label: string;
  href: string;
}

/** <Tabs active="/my/flight-bookings?group=past" tabs={[{ label: "Past", href: "/my/flight-bookings?group=past" }]} /> */
export function Tabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1 shadow-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
            tab.href === active ? "bg-foreground text-white shadow" : "text-muted hover:bg-primary-soft hover:text-primary",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
