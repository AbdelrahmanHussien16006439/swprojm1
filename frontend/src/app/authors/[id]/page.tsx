import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { PostCard } from "@/components/blog/PostCard";
import type { BlogPostSummary } from "@/components/blog/types";
import { serverApi } from "@/lib/api/server";
import type { Paginated } from "@/types/api";

export const revalidate = 60;

export async function generateStaticParams() {
  // Return no known authors at build time; ISR generates pages on first request.
  return [];
}

interface AuthorProfile {
  author: { id: string; name: string; joinedAt: string };
  posts: Paginated<BlogPostSummary>;
  itineraries: Paginated<PublicItinerary> | null;
}

interface PublicItinerary {
  id: string;
  title: string;
  countries: string[];
  startDate: string;
  days: number;
}

async function getAuthor(id: string) {
  return serverApi.get<AuthorProfile>(`/authors/${id}`, {
    query: { page: 1 },
    auth: false,
    revalidate: 60,
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { author } = await getAuthor((await params).id);
    return { title: `${author.name} — Travel blog` };
  } catch {
    return { title: "Author" };
  }
}

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let profile: AuthorProfile;
  try {
    profile = await getAuthor(id);
  } catch {
    notFound();
  }

  if (profile.author.name === "Deleted user" || profile.itineraries === null) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        title={profile.author.name}
        description={`Joined ${new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(profile.author.joinedAt))}`}
        eyebrow="✍️ Travel storyteller"
      />

      <section aria-labelledby="author-posts-heading" className="space-y-5">
        <h2 id="author-posts-heading" className="text-2xl font-bold">Published stories</h2>
        {profile.posts.data.length === 0 ? (
          <EmptyState title="No published stories yet" message="This author has not published a story yet." emoji="📝" />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {profile.posts.data.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
            {profile.posts.totalPages > 1 && (
              <Link href={`/blog?q=${encodeURIComponent(profile.author.name)}`} className="inline-flex font-semibold text-primary hover:underline">
                See all {profile.posts.total} stories by {profile.author.name} →
              </Link>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="author-itineraries-heading" className="space-y-5">
        <h2 id="author-itineraries-heading" className="text-2xl font-bold">Public itineraries</h2>
        {profile.itineraries.data.length === 0 ? (
          <EmptyState title="No public itineraries yet" message="This author has not shared an itinerary yet." emoji="🗺️" />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {profile.itineraries.data.map((itinerary) => (
                <Link key={itinerary.id} href={`/explore/${itinerary.id}`} className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary">
                  <h3 className="text-xl font-bold">{itinerary.title}</h3>
                  <p className="mt-2 text-sm text-muted">{itinerary.countries.join(", ")} · {itinerary.days} {itinerary.days === 1 ? "day" : "days"}</p>
                </Link>
              ))}
            </div>
            {profile.itineraries.totalPages > 1 && <p className="text-sm text-muted">Showing the latest 10 itineraries</p>}
          </>
        )}
      </section>
    </div>
  );
}
