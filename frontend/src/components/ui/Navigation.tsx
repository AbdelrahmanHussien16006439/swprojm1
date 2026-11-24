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

  const link = "inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-sm hover:bg-background";
  const disabled = "pointer-events-none opacity-50";

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-2">
      <Link href={href(page - 1)} className={cn(link, page <= 1 && disabled)} aria-disabled={page <= 1}>
        ← Previous
      </Link>
      <span className="text-sm text-muted">
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
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
            tab.href === active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
