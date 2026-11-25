// Home page (Member 1, GEN-14). ISR: the city, airport and story lists are cached and refreshed every 5 minutes,
// because they change rarely and the home page must load fast for every visitor.
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Icon, type IconName } from "@/components/ui";
import { PostCard } from "@/components/blog/PostCard";
import type { BlogPostSummary } from "@/components/blog/types";
import { HeroSearch, type AirportOption, type CityOption } from "@/components/home/HeroSearch";
import { DESTINATION_PHOTOS, FALLBACK_PHOTO, HERO_PHOTO, PLANNER_PHOTO, STAYS_PHOTO } from "@/components/home/destinations";
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

const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: "lock", title: "Secure checkout", text: "Card payments handled by Stripe — we never store your card." },
  { icon: "refund", title: "Transparent refunds", text: "See exactly what you'd get back before you cancel." },
  { icon: "currency", title: "Budget in your currency", text: "Daily exchange rates for every trip budget." },
  { icon: "zap", title: "Live availability", text: "Seats and rooms are held for you while you pay." },
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
      {/* HERO — full-width photo, breaks out of the centred layout column */}
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden text-white sm:-mt-10">
        <Image unoptimized src={HERO_PHOTO.photo} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/75 to-navy/30" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy/60 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto max-w-none px-4 sm:px-8 lg:px-12 2xl:px-20 pb-16 pt-16 sm:pb-24 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Flights · Stays · Trip planning
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Where will your next adventure take you?
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
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
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name={t.icon} />
            </span>
            <div>
              <h2 className="text-sm font-bold">{t.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{t.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* DESTINATIONS */}
      {cities.length > 0 && (
        <section aria-labelledby="destinations-heading">
          <SectionHeading
            id="destinations-heading"
            label="Popular destinations"
            title="Explore stays around the world"
            action={<ButtonLink href="/hotels" variant="secondary">See all stays</ButtonLink>}
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cities.map((city, i) => {
              const photo = DESTINATION_PHOTOS[city.code] ?? FALLBACK_PHOTO;
              const big = i === 0;
              const wide = !big && i === cities.length - 1 && cities.length % 2 === 0;
              return (
                <Link
                  key={city.code}
                  href={`/hotels?cityId=${encodeURIComponent(city.code)}`}
                  className={`group relative flex overflow-hidden rounded-2xl bg-navy text-white shadow-sm ${
                    big ? "col-span-2 row-span-2 min-h-80 lg:min-h-[28rem]" : wide ? "col-span-2 min-h-48 lg:min-h-52" : "min-h-48 lg:min-h-52"
                  }`}
                >
                  <Image
                    unoptimized
                    src={photo.photo}
                    alt={photo.alt}
                    fill
                    sizes={big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent" aria-hidden="true" />
                  <div className="relative mt-auto w-full p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/75">{city.country}</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className={`font-extrabold ${big ? "text-4xl" : "text-xl"}`}>{city.name}</h3>
                        <p className={`mt-1 text-white/85 ${big ? "text-base" : "hidden text-sm sm:block"}`}>{photo.tagline}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white group-hover:text-navy">
                        <Icon name="arrowRight" className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* PLANNER SHOWCASE */}
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image unoptimized src={PLANNER_PHOTO.photo} alt={PLANNER_PHOTO.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <PlannerPreview />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Trip planner</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Plan every day — and know what it costs</h2>
          <p className="mt-4 leading-7 text-muted">
            Build a day-by-day itinerary, add activities and costs, and see your whole budget converted to your currency.
            Share it publicly, or clone a plan another traveller already loved.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Days grouped by city — reorder them in seconds",
              "Food, stays, activities and transport in one budget",
              "Find hotels and flights straight from your plan",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/itineraries/new" size="lg">Start planning</ButtonLink>
            <ButtonLink href="/explore" variant="secondary" size="lg">Browse trip ideas</ButtonLink>
          </div>
        </div>
      </section>

      {/* STORIES */}
      {posts.data.length > 0 && (
        <section aria-labelledby="stories-heading">
          <SectionHeading
            id="stories-heading"
            label="From the community"
            title="Fresh travel stories"
            action={<ButtonLink href="/blog" variant="secondary">Read the blog</ButtonLink>}
          />
          <div className="grid gap-5 md:grid-cols-3">
            {posts.data.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* CLOSING BANNER */}
      <section className="relative overflow-hidden rounded-3xl text-white">
        <Image unoptimized src={STAYS_PHOTO.photo} alt="" fill sizes="(min-width: 1440px) 1440px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 px-6 py-14 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Your next trip is a few clicks away</h2>
            <p className="mt-3 max-w-xl text-white/80">Create a free account to book faster, save your plans and share your stories.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register" variant="accent" size="lg">Create free account</ButtonLink>
            <ButtonLink href="/flights" variant="secondary" size="lg" className="border-transparent">Search flights</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ id, label, title, action }: { id: string; label: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{label}</p>
        <h2 id={id} className="mt-2 text-3xl font-extrabold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** A floating preview of the itinerary planner (illustration, not real data). */
function PlannerPreview() {
  const days = [
    { day: 1, city: "Cairo", items: "Pyramids of Giza · Nile felucca", cost: "$85" },
    { day: 2, city: "Cairo", items: "Egyptian Museum · Khan el-Khalili", cost: "$60" },
    { day: 3, city: "Luxor", items: "Valley of the Kings", cost: "$120" },
  ];
  return (
    <div className="relative -mt-24 ml-auto w-[92%] space-y-2.5 rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_60px_-24px_rgba(11,23,54,0.45)] sm:-mt-32 sm:w-[80%] sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">My itinerary</p>
          <p className="font-extrabold">Egypt in 3 days</p>
        </div>
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">Public</span>
      </div>
      {days.map((d) => (
        <div key={d.day} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
          <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-navy text-white">
            <span className="text-[9px] leading-none text-white/70">DAY</span>
            <span className="text-sm font-bold leading-none">{d.day}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{d.city}</p>
            <p className="truncate text-xs text-muted">{d.items}</p>
          </div>
          <span className="text-sm font-bold text-primary">{d.cost}</span>
        </div>
      ))}
      <div className="rounded-xl bg-background p-2.5">
        <div className="flex justify-between text-xs font-semibold">
          <span>Budget used</span>
          <span>$265 of $400</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full w-2/3 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}
