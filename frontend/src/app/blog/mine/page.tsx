import { MyPostsList, type MyPost } from "@/components/blog/MyPostsList";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { serverApi } from "@/lib/api/server";
import { requireRole } from "@/lib/auth/server";
import type { Paginated } from "@/types/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "My posts" };

export default async function BlogMinePage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await requireRole("user");
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const posts = await serverApi.get<Paginated<MyPost>>("/posts/mine", { query: { page } });

  return (
    <div className="space-y-8">
      <PageHeader title="My posts" description="Manage your drafts and published travel stories." eyebrow="📝 Your writing" />
      {posts.data.length === 0 ? <EmptyState title="You have no posts yet" message="Start writing your first travel story." emoji="📝" /> : <MyPostsList initialPosts={posts} />}
      <Pagination page={posts.page} totalPages={posts.totalPages} basePath="/blog/mine" searchParams={{}} />
    </div>
  );
}
