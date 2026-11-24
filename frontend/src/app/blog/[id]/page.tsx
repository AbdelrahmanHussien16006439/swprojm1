import { notFound } from "next/navigation";
import { CommentsSection } from "@/components/blog/CommentsSection";
import { LikeButton } from "@/components/blog/LikeButton";
import { PostDetail } from "@/components/blog/PostDetail";
import type { BlogPost } from "@/components/blog/types";
import { ReportButton } from "@/components/reports";
import { ApiError, serverApi } from "@/lib/api/server";

export const revalidate = 60;

// No posts are pre-rendered at build time; visited posts are generated and revalidated on demand.
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  return [];
}

async function getPost(id: string): Promise<BlogPost> {
  return serverApi.get<BlogPost>(`/posts/${id}`, { auth: false, revalidate: 60 });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const post = await getPost((await params).id);
    return { title: post.title, description: post.body.slice(0, 160) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { title: "Post not found" };
    return { title: "Travel blog" };
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  let post: BlogPost;
  try {
    post = await getPost((await params).id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="space-y-10">
      <PostDetail post={post} />
      <div className="flex flex-wrap items-center gap-3 border-y border-border py-5">
        <LikeButton postId={post.id} initialLikesCount={post.likesCount} initialLikedByMe={post.likedByMe} />
        <ReportButton targetType="post" targetId={post.id} />
      </div>
      <CommentsSection postId={post.id} initialComments={post.comments} />
    </div>
  );
}
