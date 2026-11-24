import { notFound } from "next/navigation";
import { PostEditor } from "@/components/blog/PostEditor";
import type { BlogPost } from "@/components/blog/types";
import { ApiError, serverApi } from "@/lib/api/server";
import { requireRole } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function BlogIdEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("user");
  const { id } = await params;
  let post: BlogPost;
  try {
    post = await serverApi.get<BlogPost>(`/posts/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (post.author.id !== user.id) notFound();
  return (
    <div>
      <PostEditor mode="edit" initialPost={post} />
    </div>
  );
}
