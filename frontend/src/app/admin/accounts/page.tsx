// Accounts (ACC-14, ACC-15, ACC-16, ACC-07a). Dynamic SSR: search + filters live in the URL.
import { serverApi } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { Badge, Button, ButtonLink, EmptyState, Input, PageHeader, Pagination, Select, StatusBadge, Table } from "@/components/ui";
import type { Paginated, Role } from "@/types/api";
import { AccountActions } from "./AccountActions";

export const metadata = { title: "Accounts" };

export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended" | "deactivated";
  providerType: "airline" | "hotel" | null;
  providerId: string | null;
  registeredAt: string;
}

export default async function AccountsPage({ searchParams }: PageProps<"/admin/accounts">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Number(sp.page) || 1;

  const result = await serverApi.get<Paginated<AccountSummary>>("/admin/accounts", { query: { q, role, status, page } });
  const filtered = Boolean(q || role || status);

  return (
    <>
      <PageHeader
        eyebrow="👥 Accounts"
        title="Users & moderators"
        description={`${result.total} account${result.total === 1 ? "" : "s"}${filtered ? " match your filters" : ""}.`}
        actions={<ButtonLink href="/admin/moderators">+ New moderator</ButtonLink>}
      />

      {/* A plain GET form: the filters end up in the URL, so the page can be shared and the back button works. */}
      <form className="mb-6 grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[1fr_11rem_10rem_auto]" role="search">
        <Input name="q" defaultValue={q} placeholder="Search name or email…" aria-label="Search name or email" />
        <Select name="role" defaultValue={role} aria-label="Role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">Search</Button>
          {filtered && (
            <ButtonLink href="/admin/accounts" variant="secondary">Clear</ButtonLink>
          )}
        </div>
      </form>

      {result.data.length === 0 ? (
        <EmptyState emoji="🔍" title="No accounts found" message={filtered ? "Try a different search or remove a filter." : "Nobody has signed up yet."} />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Registered</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((a) => (
              <tr key={a.id}>
                <td>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted">{a.email}</p>
                </td>
                <td>
                  <Badge tone={a.role === "admin" ? "pink" : a.role === "user" ? "gray" : "violet"}>{ROLE_LABELS[a.role]}</Badge>
                </td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td className="whitespace-nowrap text-muted">{formatDate(a.registeredAt)}</td>
                <td className="text-right">
                  <AccountActions account={a} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} basePath="/admin/accounts" searchParams={sp} />
    </>
  );
}
