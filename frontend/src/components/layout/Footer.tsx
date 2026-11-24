import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto px-3 pb-3">
      <div className="mx-auto max-w-6xl rounded-3xl bg-foreground px-6 py-8 text-white/80 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold text-white">
              TravelMate <span aria-hidden="true">✈️</span>
            </p>
            <p className="mt-1 text-sm">Book it, plan it, post it. All in one place.</p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Footer">
            {[
              ["/flights", "Flights"],
              ["/hotels", "Hotels"],
              ["/explore", "Itineraries"],
              ["/blog", "Blog"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-6 border-t border-white/10 pt-4 text-xs text-white/50">Software Project I — Winter 2026 · GIU</p>
      </div>
    </footer>
  );
}
