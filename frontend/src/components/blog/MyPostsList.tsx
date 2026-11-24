"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { Button, ButtonLink, Card, EmptyState, FormErrors, StatusBadge } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import type { Paginated } from "@/types/api";

export interface MyPost {
  id: string;
  title: string;
  status: "draft" | "published";
  date: string;
  likesCount: number;
  commentsCount: number;
}

export function MyPostsList({ initialPosts }: { initialPosts: Paginated<MyPost> }) {
  const [posts, setPosts] = useState(initialPosts.data);
  const [deleting, setDeleting] = useState<MyPost | null>(null);
  const [error, setError] = useState<unknown>(null);

  const deletePost = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/posts/${deleting.id}`);
      setPosts((current) => current.filter((post) => post.id !== deleting.id));
      setDeleting(null);
    } catch (deleteError) {
      setError(deleteError);
    }
  };

  if (posts.length === 0) {
    return <EmptyState title="You have no posts yet" message="Start writing your first travel story." emoji="📝" action={<ButtonLink href="/blog/new">Create a post</ButtonLink>} />;
  }

  return (
    <div className="space-y-4">
      <FormErrors error={error} />
      {posts.map((post) => (
        <Card key={post.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href={post.status === "draft" ? `/blog/${post.id}/edit` : `/blog/${post.id}`} className="text-lg font-bold hover:text-primary">{post.title}</Link>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
                <StatusBadge status={post.status} />
                <span>{formatDate(post.date)}</span>
                <span>♥ {post.likesCount}</span>
                <span>💬 {post.commentsCount}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <ButtonLink href={`/blog/${post.id}/edit`} variant="secondary" size="sm">Edit</ButtonLink>
              <Button type="button" variant="danger" size="sm" onClick={() => setDeleting(post)}>Delete</Button>
            </div>
          </div>
        </Card>
      ))}
      <ConfirmDialog open={deleting !== null} danger title="Delete this post?" message="This deletes the post, comments, likes and attached images." confirmLabel="Delete" onConfirm={deletePost} onCancel={() => setDeleting(null)} />
    </div>
  );
}
