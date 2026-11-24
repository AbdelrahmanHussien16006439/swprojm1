// Home page (Member 1). Task 5 adds the real flight and hotel search forms from Members 3 and 5.
import Link from "next/link";
import { Badge, ButtonLink } from "@/components/ui";

const features = [
  {
    href: "/flights",
    emoji: "✈️",
    title: "Flights",
    text: "One-way or round trip, every cabin. Compare and book in minutes.",
    tile: "bg-primary-soft",
  },
  {
    href: "/hotels",
    emoji: "🏨",
    title: "Hotels",
    text: "Real-time availability, clear policies, no double bookings.",
    tile: "bg-accent-soft",
  },
  {
    href: "/explore",
    emoji: "🗺️",
    title: "Itineraries",
    text: "Plan day by day, track your budget, clone trips you love.",
    tile: "bg-warning-soft",
  },
  {
    href: "/blog",
    emoji: "📝",
    title: "Blog",
    text: "Stories, hacks and hidden gems from other travellers.",
    tile: "bg-success-soft",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-brand px-6 py-14 text-white shadow-2xl shadow-primary/30 sm:px-12 sm:py-20">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-lime/30 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            ✨ Your whole trip, one app
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl">
            Book it. Plan it.
            <br />
            <span className="text-lime">Post it.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">
            Flights, hotels, day-by-day plans with a real budget, and stories from people who&apos;ve been there.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/flights" variant="dark" size="lg">
              ✈️ Find flights
            </ButtonLink>
            <ButtonLink href="/hotels" variant="secondary" size="lg">
              🏨 Find hotels
            </ButtonLink>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">What are we doing today? 👀</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-3xl border border-border bg-surface p-6 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] transition duration-200 hover:-translate-y-1 hover:border-primary/30"
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${f.tile}`} aria-hidden="true">
                {f.emoji}
              </span>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-primary transition group-hover:translate-x-1">Let&apos;s go →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div>
          <Badge tone="lime">New here?</Badge>
          <h2 className="mt-3 text-2xl font-bold">Make an account and start planning 🧳</h2>
          <p className="mt-1 text-sm text-muted">Save itineraries, book faster and join the community.</p>
        </div>
        <ButtonLink href="/register" size="lg">
          Join free ✨
        </ButtonLink>
      </section>
    </div>
  );
}
