import Link from "next/link";
import { Logo } from "./Logo";
import { Icon } from "@/components/ui/Icon";

const columns = [
  {
    title: "Book",
    links: [
      ["/hotels", "Stays"],
      ["/flights", "Flights"],
      ["/my/flight-bookings", "My flight bookings"],
      ["/my/hotel-bookings", "My stays"],
    ],
  },
  {
    title: "Plan",
    links: [
      ["/explore", "Trip ideas"],
      ["/itineraries", "My itineraries"],
      ["/itineraries/new", "Plan a new trip"],
    ],
  },
  {
    title: "Community",
    links: [
      ["/blog", "Travel stories"],
      ["/blog/new", "Write a story"],
    ],
  },
  {
    title: "Account",
    links: [
      ["/login", "Sign in"],
      ["/register", "Create account"],
      ["/profile", "My profile"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-navy text-white/70">
      <div className="mx-auto max-w-none px-4 sm:px-8 lg:px-12 2xl:px-20 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="space-y-3">
            <Logo light />
            <p className="max-w-xs text-sm leading-6">
              Flights, stays and day-by-day trip plans with a real budget — all in one place.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><Icon name="lock" className="h-3.5 w-3.5" /> Secure Stripe payments</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><Icon name="globe" className="h-3.5 w-3.5" /> Multi-currency budgets</span>
            </div>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="space-y-3">
              <p className="text-sm font-bold text-white">{col.title}</p>
              <ul className="space-y-2 text-sm">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="transition hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© 2026 TravelMate · Software Project I, Winter 2026 · German International University</p>
          <p>Prices in USD · Payments by Stripe (test mode) · Photos from Unsplash</p>
        </div>
      </div>
    </footer>
  );
}
