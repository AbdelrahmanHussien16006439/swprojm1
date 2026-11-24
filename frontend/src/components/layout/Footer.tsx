import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>TravelMate — Software Project I, Winter 2026</p>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/flights" className="hover:text-foreground">Flights</Link>
          <Link href="/hotels" className="hover:text-foreground">Hotels</Link>
          <Link href="/explore" className="hover:text-foreground">Itineraries</Link>
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
        </nav>
      </div>
    </footer>
  );
}
