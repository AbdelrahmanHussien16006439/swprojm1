// Home page (Member 1, GEN-14). ISR: the city, airport and story lists are cached and refreshed every 5 minutes,
// because they change rarely and the home page must load fast for every visitor.
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { PostCard } from "@/components/blog/PostCard";
import type { BlogPostSummary } from "@/components/blog/types";
import { HeroSearch, type AirportOption, type CityOption } from "@/components/home/HeroSearch";
import { DEFAULT_ART, DESTINATION_ART } from "@/components/home/destinations";
import { serverApi } from "@/lib/api/server";
import type { Paginated } from "@/types/api";

export const revalidate = 300;

interface CityRow {
  cityId: string;
  name: string;
  countryId: { name: string } | string;
}
interface AirportRow {
  _id: string;
  iataCode: string;
  cityId: { name: string } | string;
}

/** Public data for the home page. If the backend is down, the page still renders (empty lists). */
async function load<T>(path: string, fallback: T): Promise<T> {
  try {
    return await serverApi.get<T>(path, { auth: false, revalidate });
  } catch {
    return fallback;
  }
}

const TRUST = [
  { icon: "🔒", title: "Secure checkout", text: "Card payments handled by Stripe — we never store your card." },
  { icon: "↩️", title: "Clear refunds", text: "See the refund you'd get before you cancel, every time." },
  { icon: "💱", title: "Budget in your currency", text: "Daily exchange rates for every trip budget." },
  { icon: "⚡", title: "Live availability", text: "Seats and rooms are held for you while you pay." },
];

export default async function HomePage() {
  const empty = { data: [], page: 1, limit: 10, total: 0, totalPages: 0 };
  const [cityPage, airportPage, posts] = await Promise.all([
    load<Paginated<CityRow>>("/cities", empty),
    load<Paginated<AirportRow>>("/airports", empty),
    load<Paginated<BlogPostSummary>>("/posts", empty),
  ]);

  const cities: CityOption[] = cityPage.data.map((c) => ({
    code: c.cityId,
    name: c.name,
    country: typeof c.countryId === "object" ? c.countryId.name : "",
  }));
  const airports: AirportOption[] = airportPage.data
    .map((a) => ({ id: a._id, iata: a.iataCode, city: typeof a.cityId === "object" ? a.cityId.name : a.iataCode }))
    .sort((a, b) => a.city.localeCompare(b.city));

  return (
    <div className="space-y-20">
      {/* HERO — full width, breaks out of the centred layout column */}
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-brand text-white sm:-mt-10">
        <HeroArt />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pb-24 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent" /> Flights · Stays · Trip planning
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Where will your next <span className="text-accent">adventure</span> take you?
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Compare flights, book hotels and plan every day of your trip with a budget that follows you — in one place.
          </p>
          <div className="mt-10">
            <HeroSearch cities={cities} airports={airports} />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label="Why book with TravelMate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="flex gap-4 rounded-2xl border border-border bg-surface p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xl" aria-hidden="true">
              {t.icon}
            </span>
            <div>
              <h2 className="text-sm font-bold">{t.title}</h2>
              <p className="mt-1 text-sm text-muted">{t.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* DESTINATIONS */}
      {cities.length > 0 && (
        <section aria-labelledby="destinations-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-accent">Popular right now</p>
              <h2 id="destinations-heading" className="mt-1 text-3xl font-extrabold">Explore stays around the world</h2>
            </div>
            <ButtonLink href="/hotels" variant="secondary">See all stays →</ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cities.map((city, i) => {
              const art = DESTINATION_ART[city.code] ?? DEFAULT_ART;
              return (
                <Link
                  key={city.code}
                  href={`/hotels?cityId=${encodeURIComponent(city.code)}`}
                  className={`group relative flex overflow-hidden rounded-2xl p-5 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${i === 0 ? "col-span-2 row-span-2 min-h-80 lg:min-h-[26rem]" : i === cities.length - 1 && cities.length % 2 === 0 ? "col-span-2 min-h-44 lg:min-h-48" : "min-h-44 lg:min-h-48"}`}
                  style={{ backgroundImage: art.gradient }}
                >
                  <span
                    className={`pointer-events-none absolute -right-3 -top-3 select-none opacity-90 transition duration-500 group-hover:scale-110 ${i === 0 ? "text-[9rem]" : "text-7xl"}`}
                    aria-hidden="true"
                  >
                    {art.emoji}
                  </span>
                  <div className="relative mt-auto">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{city.country}</p>
                    <h3 className={`font-extrabold ${i === 0 ? "text-4xl" : "text-xl"}`}>{city.name}</h3>
                    <p className={`mt-1 text-white/85 ${i === 0 ? "text-base" : "hidden text-sm sm:block"}`}>{art.tagline}</p>
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur transition group-hover:bg-white group-hover:text-navy">
                      Find stays →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* PLANNER SHOWCASE */}
      <section className="grid items-center gap-10 overflow-hidden rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-border sm:p-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-accent">Trip planner</p>
          <h2 className="mt-1 text-3xl font-extrabold">Plan every day — and know what it costs</h2>
          <p className="mt-3 text-muted">
            Build a day-by-day itinerary, add activities and costs, and see your whole budget converted to your currency.
            Make it public, or clone a plan someone else already loved.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Days grouped by city, drag to reorder",
              "Food, stays, activities and transport in one budget",
              "Find hotels and flights straight from your plan",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/itineraries/new" variant="primary" size="lg">Start planning</ButtonLink>
            <ButtonLink href="/explore" variant="secondary" size="lg">Browse trip ideas</ButtonLink>
          </div>
        </div>
        <PlannerPreview />
      </section>

      {/* STORIES */}
      {posts.data.length > 0 && (
        <section aria-labelledby="stories-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-accent">From the community</p>
              <h2 id="stories-heading" className="mt-1 text-3xl font-extrabold">Fresh travel stories</h2>
            </div>
            <ButtonLink href="/blog" variant="secondary">Read the blog →</ButtonLink>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {posts.data.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* CLOSING BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 text-white sm:px-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold">Your next trip is a few clicks away</h2>
            <p className="mt-2 max-w-xl text-white/75">Create a free account to book faster, save your plans and share your stories.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register" variant="accent" size="lg">Create free account</ButtonLink>
            <ButtonLink href="/flights" size="lg" className="bg-white/10 text-white shadow-none hover:bg-white/20">Search flights</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Decorative hero background: dotted globe grid, glowing blobs and a dashed flight path. */
function HeroArt() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
      <div className="absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]">
        <defs>
          <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-x-0 top-6 hidden h-72 w-full md:block">
        <path d="M60 330 C 360 40, 760 40, 1140 250" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 10" />
        <circle cx="60" cy="330" r="6" fill="white" fillOpacity="0.6" />
        <circle cx="1140" cy="250" r="6" fill="var(--color-accent)" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute right-[18%] top-16 hidden h-10 w-10 rotate-12 md:block">
        <path d="M2.5 11.2 21 3.5l-6.9 17.6-3.3-6.8-8.3-3.1Z" fill="white" />
      </svg>
    </div>
  );
}

/** A static preview of the itinerary planner (illustration, not real data). */
function PlannerPreview() {
  const days = [
    { day: 1, city: "Cairo", items: ["Pyramids of Giza", "Felucca on the Nile"], cost: "$85" },
    { day: 2, city: "Cairo", items: ["Egyptian Museum", "Khan el-Khalili dinner"], cost: "$60" },
    { day: 3, city: "Luxor", items: ["Valley of the Kings"], cost: "$120" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-primary-soft" aria-hidden="true" />
      <div className="relative space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">My itinerary</p>
            <p className="text-lg font-extrabold">Egypt in 3 days 🇪🇬</p>
          </div>
          <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">Public</span>
        </div>
        {days.map((d) => (
          <div key={d.day} className="flex gap-3 rounded-xl border border-border p-3">
            <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-navy text-white">
              <span className="text-[10px] leading-none text-white/70">DAY</span>
              <span className="text-sm font-bold leading-none">{d.day}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{d.city}</p>
              <p className="truncate text-xs text-muted">{d.items.join(" · ")}</p>
            </div>
            <span className="text-sm font-bold text-primary">{d.cost}</span>
          </div>
        ))}
        <div className="rounded-xl bg-background p-3">
          <div className="flex justify-between text-xs font-semibold">
            <span>Budget used</span>
            <span>$265 of $400</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full w-2/3 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
