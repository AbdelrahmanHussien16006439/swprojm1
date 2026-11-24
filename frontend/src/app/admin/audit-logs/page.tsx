import { serverApi } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { Button, ButtonLink, EmptyState, Input, PageHeader, Pagination, Table } from "@/components/ui";
import type { Paginated } from "@/types/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

interface AuditLogRow {
  _id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const actorId = typeof sp.actorId === "string" ? sp.actorId : "";
  const action = typeof sp.action === "string" ? sp.action : "";
  const startDate = typeof sp.startDate === "string" ? sp.startDate : "";
  const endDate = typeof sp.endDate === "string" ? sp.endDate : "";
  const page = Number(sp.page) || 1;
  const result = await serverApi.get<Paginated<AuditLogRow>>("/admin/audit-logs", { query: { actorId, action, startDate, endDate, page } });
  const filtered = Boolean(actorId || action || startDate || endDate);

  return (
    <div>
      <PageHeader eyebrow="📜 Administration" title="Audit log" description={`${result.total} entr${result.total === 1 ? "y" : "ies"}.`} />
      <form className="mb-6 grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_11rem_11rem_auto]" role="search">
        <Input name="actorId" defaultValue={actorId} placeholder="Actor ID" aria-label="Actor ID" /><Input name="action" defaultValue={action} placeholder="Action" aria-label="Action" /><Input name="startDate" type="date" defaultValue={startDate} aria-label="Start date" /><Input name="endDate" type="date" defaultValue={endDate} aria-label="End date" /><div className="flex gap-2"><Button type="submit">Filter</Button>{filtered && <ButtonLink href="/admin/audit-logs" variant="secondary">Clear</ButtonLink>}</div>
      </form>
      {result.data.length === 0 ? <EmptyState emoji="📜" title="No audit entries found" message={filtered ? "Try different filters." : "Administrative actions will appear here."} /> : (
        <Table><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>
          {result.data.map((entry) => <tr key={entry._id}><td className="whitespace-nowrap text-muted">{formatDate(entry.createdAt)}</td><td className="font-mono text-xs">{entry.actorId}</td><td><span className="font-semibold">{entry.action}</span></td><td className="font-mono text-xs">{entry.targetType} / {entry.targetId}</td><td className="max-w-xs truncate text-xs text-muted">{entry.details ? JSON.stringify(entry.details) : "—"}</td></tr>)}
        </tbody></Table>
      )}
      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/audit-logs" searchParams={sp} />
    </div>
  );
}
