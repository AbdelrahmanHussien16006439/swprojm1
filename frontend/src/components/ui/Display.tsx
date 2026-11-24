// Display components (Member 1): Card, Badge, PageHeader, EmptyState, ErrorState, Table.
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6", className)}>{children}</div>;
}

type Tone = "gray" | "green" | "yellow" | "red" | "blue";

const tones: Record<Tone, string> = {
  gray: "bg-background text-muted border-border",
  green: "bg-success-soft text-success border-success/30",
  yellow: "bg-warning-soft text-warning border-warning/30",
  red: "bg-danger-soft text-danger border-danger/30",
  blue: "bg-info-soft text-info border-info/30",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
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
  /** Shows "← Back" so users can always go back (GEN-14). */
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, backHref, backLabel = "Back", actions }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-2">
      {backHref && (
        <Link href={backHref} className="text-sm text-primary hover:underline">
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Friendly message for empty lists and searches with no results (GEN-04). */
export function EmptyState({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {message && <p className="mt-1 text-sm text-muted">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Error block with an optional retry button (GEN-16). */
export function ErrorState({ title = "Something went wrong", message, action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-6 py-10 text-center">
      <p className="text-base font-medium text-danger">{title}</p>
      {message && <p className="mt-1 text-sm text-danger">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Scrolls sideways on phones instead of breaking the layout. Use normal <thead>/<tbody>/<tr>/<th>/<td> inside. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:bg-background [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_th]:text-muted [&_tr]:border-b [&_tr]:border-border [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}
