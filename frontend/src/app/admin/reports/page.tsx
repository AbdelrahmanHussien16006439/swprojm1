import { serverApi } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { Button, ButtonLink, EmptyState, PageHeader, Pagination, Select, StatusBadge, Table } from "@/components/ui";
import type { Paginated } from "@/types/api";
import { ReportActions } from "../ModerationActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

interface ReportRow {
  id: string;
  targetType: "post" | "comment" | "review" | "itinerary";
  targetId: string;
  reason: string;
  status: "open" | "dismissed" | "hidden" | "deleted";
  createdAt: string;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Number(sp.page) || 1;
  const result = await serverApi.get<Paginated<ReportRow>>("/admin/reports", { query: { targetType: type, status, page } });
  const filtered = Boolean(type || status);

  return (
    <div>
      <PageHeader eyebrow="🚩 Moderation" title="Reports" description={`${result.total} report${result.total === 1 ? "" : "s"}.`} />
      <form className="mb-6 grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[12rem_12rem_auto]" role="search">
        <Select name="type" defaultValue={type} aria-label="Report type"><option value="">All types</option><option value="post">Post</option><option value="comment">Comment</option><option value="review">Review</option><option value="itinerary">Itinerary</option></Select>
        <Select name="status" defaultValue={status} aria-label="Report status"><option value="">All statuses</option><option value="open">Open</option><option value="dismissed">Dismissed</option><option value="hidden">Hidden</option><option value="deleted">Deleted</option></Select>
        <div className="flex gap-2"><Button type="submit">Filter</Button>{filtered && <ButtonLink href="/admin/reports" variant="secondary">Clear</ButtonLink>}</div>
      </form>
      {result.data.length === 0 ? <EmptyState emoji="🚩" title="No reports found" message={filtered ? "Try different filters." : "There are no reports to review."} /> : (
        <Table><thead><tr><th>Type</th><th>Target</th><th>Reason</th><th>Status</th><th>Reported</th><th className="text-right">Actions</th></tr></thead><tbody>
          {result.data.map((report) => <tr key={report.id}><td className="font-semibold capitalize">{report.targetType}</td><td className="max-w-36 truncate font-mono text-xs">{report.targetId}</td><td className="max-w-xs">{report.reason}</td><td><StatusBadge status={report.status} /></td><td className="whitespace-nowrap text-muted">{formatDate(report.createdAt)}</td><td><ReportActions reportId={report.id} targetType={report.targetType} /></td></tr>)}
        </tbody></Table>
      )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/reports" searchParams={sp} />
    </div>
  );
}
