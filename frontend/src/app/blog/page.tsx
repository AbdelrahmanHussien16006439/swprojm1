import Link from "next/link";
import { Button, EmptyState, ErrorState, Input, PageHeader, Pagination } from "@/components/ui";
import { PostCard } from "@/components/blog/PostCard";
import type { BlogPostSummary } from "@/components/blog/types";
import { ApiError, serverApi } from "@/lib/api/server";
import type { Paginated } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Travel blog",
  description: "Travel stories, tips and inspiration from the TravelMate community.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = first(params.q)?.trim() ?? "";
  const tag = first(params.tag)?.trim() ?? "";
  const parsedPage = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let posts: Paginated<BlogPostSummary>;
  try {
    posts = await serverApi.get<Paginated<BlogPostSummary>>("/posts", {
      query: { page, q: q || undefined, tag: tag || undefined },
      auth: false,
    });
  } catch (error) {
    return (
      <div>
        <PageHeader title="Travel blog" description="Stories and tips from fellow travellers." eyebrow="📝 Community" />
        <ErrorState message={error instanceof ApiError ? error.messages.join(" ") : "We could not load the blog right now."} />
      </div>
    );
  }

  const filters = { q: q || undefined, tag: tag || undefined };
  return (
    <div>
      <PageHeader title="Travel blog" description="Stories and tips from fellow travellers." eyebrow="📝 Community" />
      <form method="get" className="mb-8 grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1 text-sm font-semibold">
          <span>Search stories</span>
          <Input name="q" defaultValue={q} placeholder="Try Cairo, beaches or food" />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          <span>Filter by tag</span>
          <Input name="tag" defaultValue={tag} placeholder="e.g. egypt" maxLength={30} />
        </label>
        <div className="flex gap-2">
          <Button type="submit">Search</Button>
          {(q || tag) && <Link href="/blog" className="rounded-full px-4 py-3 text-sm font-semibold text-muted hover:bg-primary-soft hover:text-primary">Clear filters</Link>}
        </div>
      </form>
      {posts.data.length === 0 ? (
        <EmptyState title="No stories found" message={q || tag ? "Try a different search or tag." : "New travel stories will appear here soon."} emoji="🔎" />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.data.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          <Pagination page={posts.page} totalPages={posts.totalPages} basePath="/blog" searchParams={filters} />
        </>
      )}
    </div>
  );
}
