import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import type { BlogPostSummary } from "@/components/blog/types";
import { Button, EmptyState, ErrorState, Input, PageHeader, Pagination } from "@/components/ui";
import { ApiError, serverApi } from "@/lib/api/server";
import type { Paginated } from "@/types/api";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const label = decodeURIComponent(tag).trim().toLowerCase();
  return {
    title: `#${label} travel stories`,
    description: `Published TravelMate stories tagged ${label}.`,
  };
}

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TagsTagPage({ params, searchParams }: { params: Promise<{ tag: string }>; searchParams: Promise<SearchParams> }) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).trim().toLowerCase();
  const query = await searchParams;
  const q = first(query.q)?.trim() ?? "";
  const parsedPage = Number.parseInt(first(query.page) ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let posts: Paginated<BlogPostSummary>;
  try {
    posts = await serverApi.get<Paginated<BlogPostSummary>>("/posts", {
      query: { page, tag, q: q || undefined },
      auth: false,
    });
  } catch (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <PageHeader title={`Posts tagged #${tag}`} eyebrow="🏷️ Blog tag" backHref="/blog" />
        <ErrorState message={error instanceof ApiError ? error.messages.join(" ") : "We could not load this tag right now."} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title={`Posts tagged #${tag}`} description="Explore published stories with this tag." eyebrow="🏷️ Blog tag" backHref="/blog" />
      <form method="get" className="mb-8 flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-sm font-semibold">
          <span>Search within this tag</span>
          <Input name="q" defaultValue={q} placeholder="Search stories" />
        </label>
        <Button type="submit">Search</Button>
        {q && <Link href={`/tags/${encodeURIComponent(tag)}`} className="rounded-full px-4 py-3 text-sm font-semibold text-muted hover:bg-primary-soft hover:text-primary">Clear</Link>}
      </form>
      {posts.data.length === 0 ? (
        <EmptyState title="No stories use this tag yet" message={q ? "Try a different search." : "Check back soon for new stories."} emoji="🏷️" />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.data.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          <Pagination page={posts.page} totalPages={posts.totalPages} basePath={`/tags/${encodeURIComponent(tag)}`} searchParams={{ q: q || undefined }} />
        </>
      )}
    </main>
  );
}
