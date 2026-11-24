// Display components (Member 1): Card, Badge, PageHeader, EmptyState, ErrorState, Table.
import Link from "next/link";
import { cn } from "@/lib/cn";

/** White rounded card. Add `interactive` for clickable cards (lifts on hover). */
export function Card({ className, interactive, children }: { className?: string; interactive?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-surface p-5 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] sm:p-7",
        interactive && "transition duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_-12px_rgba(255,79,163,0.30)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type Tone = "gray" | "green" | "yellow" | "red" | "blue" | "violet" | "pink" | "lime";

const tones: Record<Tone, string> = {
  gray: "bg-background text-muted",
  green: "bg-success-soft text-success",
  yellow: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  blue: "bg-info-soft text-info",
  violet: "bg-primary-soft text-primary",
  pink: "bg-accent-soft text-accent",
  lime: "bg-lime text-foreground",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

/** Same colour for the same status everywhere (GEN-11 lifecycle, flight status, report status...). */
export function statusTone(status: string): Tone {
  switch (status) {
    case "confirmed":
    case "active":
    case "published":
    case "scheduled":
    case "refunded":
    case "succeeded":
    case "resolved":
      return "green";
    case "pending_payment":
    case "pending":
    case "draft":
    case "open":
      return "yellow";
    case "cancelled":
    case "expired":
    case "failed":
    case "suspended":
    case "deactivated":
    case "hidden":
      return "red";
    case "completed":
    case "departed":
      return "blue";
    default:
      return "gray";
  }
}

/** "pending_payment" → "Pending payment" */
export function statusLabel(status: string): string {
  const text = status.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Small emoji or label above the title, e.g. "✈️ Flights". */
  eyebrow?: string;
  /** Shows "← Back" so users can always go back (GEN-14). */
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, eyebrow, backHref, backLabel = "Back", actions }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-3">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-sm font-medium text-muted shadow-sm hover:text-primary">
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="mb-1 text-sm font-semibold text-primary">{eyebrow}</p>}
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Friendly message for empty lists and searches with no results (GEN-04). */
export function EmptyState({ title, message, emoji = "🧳", action }: { title: string; message?: string; emoji?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-surface/70 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-3xl" aria-hidden="true">
        {emoji}
      </div>
      <p className="font-display text-lg font-bold">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Error block with an optional retry button (GEN-16). */
export function ErrorState({ title = "Oops, something broke", message, action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-3xl border border-danger/20 bg-danger-soft px-6 py-12 text-center">
      <div className="mb-3 text-4xl" aria-hidden="true">😵‍💫</div>
      <p className="font-display text-lg font-bold text-danger">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-danger/80">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Scrolls sideways on phones instead of breaking the layout. Use normal <thead>/<tbody>/<tr>/<th>/<td> inside. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm [&_td]:px-5 [&_td]:py-4 [&_th]:bg-primary-soft/50 [&_th]:px-5 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_tbody_tr]:transition [&_tbody_tr:hover]:bg-background [&_tr]:border-b [&_tr]:border-border [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}
