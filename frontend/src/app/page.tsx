// Home page (Member 1, task 5 adds the flight and hotel search forms from Members 3 and 5).
import { ButtonLink, Card } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-primary px-6 py-12 text-white sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">Plan your whole trip in one place</h1>
        <p className="mt-3 max-w-2xl text-white/90">
          Search flights and hotels, build a day-by-day itinerary with a budget, and read stories from other travellers.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/flights" variant="secondary">Search flights</ButtonLink>
          <ButtonLink href="/hotels" variant="secondary">Search hotels</ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Explore itineraries</h2>
          <p className="mt-1 text-sm text-muted">Get inspired by public trips and clone one to make it yours.</p>
          <ButtonLink href="/explore" variant="ghost" className="mt-3 px-0">Browse itineraries →</ButtonLink>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Travel blog</h2>
          <p className="mt-1 text-sm text-muted">Tips and stories from the community.</p>
          <ButtonLink href="/blog" variant="ghost" className="mt-3 px-0">Read the blog →</ButtonLink>
        </Card>
      </section>
    </div>
  );
}
