// Hotel moderator area. Created by Member 1 — OWNER: Member 5 (add your links here as you build the pages).
import { requireRole } from "@/lib/auth/server";
import { DashboardShell, type SidebarLink } from "@/components/layout/Sidebar";

const LINKS: SidebarLink[] = [
  { href: "/moderator/hotel", label: "Overview" },
  { href: "/moderator/hotel/reservations", label: "Reservations" }, // Member 6
  // Member 5: e.g. { href: "/moderator/hotel/profile", label: "Hotel profile" },
  //               { href: "/moderator/hotel/rooms", label: "Rooms" },
];

export default async function HotelModeratorLayout({ children }: LayoutProps<"/moderator/hotel">) {
  await requireRole("hotel_moderator");
  return (
    <DashboardShell title="Hotel" links={LINKS}>
      {children}
    </DashboardShell>
  );
}
