// Airline moderator area. Created by Member 1 — OWNER: Member 3 (add your links here as you build the pages).
import { requireRole } from "@/lib/auth/server";
import { DashboardShell, type SidebarLink } from "@/components/layout/Sidebar";

const LINKS: SidebarLink[] = [
  { href: "/moderator/airline", label: "Overview" },
  // Member 3: e.g. { href: "/moderator/airline/profile", label: "Airline profile" },
  //               { href: "/moderator/airline/flights", label: "Flights" },
];

export default async function AirlineModeratorLayout({ children }: LayoutProps<"/moderator/airline">) {
  await requireRole("airline_moderator");
  return (
    <DashboardShell title="Airline" links={LINKS}>
      {children}
    </DashboardShell>
  );
}
