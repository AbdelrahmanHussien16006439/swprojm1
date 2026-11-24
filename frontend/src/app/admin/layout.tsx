// Admin area (Member 1). Only admins get in (navigation only — the backend checks every request too).
import { requireRole } from "@/lib/auth/server";
import { ADMIN_LINKS, DashboardShell } from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("admin");
  return (
    <DashboardShell title="Admin" links={ADMIN_LINKS}>
      {children}
    </DashboardShell>
  );
}
