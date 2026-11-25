"use client";

// Home page search box (Member 1). Each tab sends the user to the search page of its owner with the
// URL parameters from TEAM_PLAN M2.3:  /hotels?cityId=&checkIn=&checkOut=&guests=&rooms=  (Member 5)
//                                      /flights?from=&to=&departDate=&returnDate=&adults=&children=&infants=&cabinClass=  (Member 3)
//                                      /explore?q=  (Member 7)
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Icon, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface CityOption {
  code: string;
  name: string;
  country: string;
}

export interface AirportOption {
  id: string;
  iata: string;
  city: string;
}

type Tab = "stays" | "flights" | "plan";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "stays", label: "Stays", icon: <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" /> },
  { id: "flights", label: "Flights", icon: <path d="m2 16 20-8-4 12-5-4-4 3v-5l9-6" /> },
  { id: "plan", label: "Plan a trip", icon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" /> },
];

/** "YYYY-MM-DD", `days` from today (local time). */
function isoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

/** "2026-12-09" → "Wed, 9 Dec" (read as a calendar date, no time-zone shift). */
function niceDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Plain-English summary under the date fields, e.g. "Wed, 9 Dec → Sat, 12 Dec · 3 nights". */
function DateSummary({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary">
      <Icon name="calendar" className="h-4 w-4" />
      {children}
    </p>
  );
}

export function HeroSearch({ cities, airports }: { cities: CityOption[]; airports: AirportOption[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stays");
  const [error, setError] = useState<string | null>(null);
  const today = isoDate(0);

  // Stays
  const [cityId, setCityId] = useState("");
  const [checkIn, setCheckIn] = useState(() => isoDate(14));
  const [checkOut, setCheckOut] = useState(() => isoDate(17));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  // Flights
  const [tripType, setTripType] = useState<"round_trip" | "one_way">("round_trip");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departDate, setDepartDate] = useState(() => isoDate(14));
  const [returnDate, setReturnDate] = useState(() => isoDate(21));
  const [adults, setAdults] = useState(1);
  const [cabinClass, setCabinClass] = useState("economy");

  // Plan
  const [keyword, setKeyword] = useState("");

  const go = (path: string, params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
    router.push(`${path}?${query.toString()}`);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tab === "stays") {
      if (!cityId) return setError("Choose where you're going.");
      if (checkOut <= checkIn) return setError("Check-out must be after check-in.");
      go("/hotels", { cityId, checkIn, checkOut, guests, rooms });
    } else if (tab === "flights") {
      if (!from || !to) return setError("Choose where you're leaving from and going to.");
      if (from === to) return setError("Departure and arrival airports must be different.");
      if (tripType === "round_trip" && returnDate < departDate) return setError("Return date must be after the departure date.");
      go("/flights", {
        from,
        to,
        departDate,
        returnDate: tripType === "round_trip" ? returnDate : undefined,
        adults,
        children: 0,
        infants: 0,
        cabinClass,
      });
    } else {
      go("/explore", { q: keyword.trim() });
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-2 text-foreground shadow-[0_24px_60px_-20px_rgba(11,23,54,0.55)]">
      <div role="tablist" aria-label="What are you looking for?" className="flex gap-1 border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={cn(
              "relative flex items-center gap-2 px-3 py-3.5 text-base font-bold transition-colors sm:px-5",
              "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full",
              tab === t.id ? "text-primary after:bg-primary" : "text-muted hover:text-foreground",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              {t.icon}
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4 p-4 sm:p-5" noValidate>
        {tab === "stays" && (
          <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_0.7fr_0.7fr]">
            <Field label="Going to">
              <Select value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label="Destination city">
                <option value="">Where are you going?</option>
                {cities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}, {c.country}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Check-in">
              <Input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </Field>
            <Field label="Check-out">
              <Input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </Field>
            <Field label="Guests">
              <Input type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
            <Field label="Rooms">
              <Input type="number" min={1} max={10} value={rooms} onChange={(e) => setRooms(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
          </div>
        )}
        {tab === "stays" && checkIn && checkOut && daysBetween(checkIn, checkOut) > 0 && (
          <DateSummary>
            {niceDate(checkIn)} → {niceDate(checkOut)} · {daysBetween(checkIn, checkOut)} night{daysBetween(checkIn, checkOut) === 1 ? "" : "s"} · {guests} guest{guests === 1 ? "" : "s"}, {rooms} room{rooms === 1 ? "" : "s"}
          </DateSummary>
        )}

        {tab === "flights" && (
          <div className="space-y-3">
            <div className="flex gap-2" role="radiogroup" aria-label="Trip type">
              {(["round_trip", "one_way"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tripType === t}
                  onClick={() => setTripType(t)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                    tripType === t ? "border-primary bg-primary-soft text-primary" : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {t === "round_trip" ? "Round trip" : "One way"}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.9fr_0.9fr_0.6fr_0.9fr]">
              <Field label="Leaving from">
                <Select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Departure airport">
                  <option value="">From</option>
                  {airports.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.city} ({a.iata})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Going to">
                <Select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Arrival airport">
                  <option value="">To</option>
                  {airports.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.city} ({a.iata})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Depart">
                <Input type="date" min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
              </Field>
              <Field label="Return">
                <Input
                  type="date"
                  min={departDate}
                  value={returnDate}
                  disabled={tripType === "one_way"}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </Field>
              <Field label="Adults">
                <Input type="number" min={1} max={9} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} />
              </Field>
              <Field label="Cabin class">
                <Select value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {tab === "flights" && departDate && (
          <DateSummary>
            Departs {niceDate(departDate)}
            {tripType === "round_trip" && returnDate >= departDate
              ? ` · returns ${niceDate(returnDate)} (${daysBetween(departDate, returnDate)} days)`
              : " · one way"}{" "}
            · {adults} adult{adults === 1 ? "" : "s"}
          </DateSummary>
        )}

        {tab === "plan" && (
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Get inspired">
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search trip ideas — e.g. Cairo, Paris, 5 days…" />
            </Field>
            <Button variant="secondary" size="lg" onClick={() => router.push("/itineraries/new")}>
              Start my own plan
            </Button>
          </div>
        )}

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert" className="min-h-5 text-sm font-medium text-danger">
            {error}
          </p>
          <Button type="submit" variant="accent" size="lg" className="sm:min-w-44">
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}
