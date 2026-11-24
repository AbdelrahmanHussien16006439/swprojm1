import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { BlogPostSummary } from "./types";

export function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Card interactive className="h-full">
      <article className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <Badge tone="violet">Travel story</Badge>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
        <h2 className="mt-5 text-xl font-bold">
          <Link href={`/blog/${post.id}`} className="transition hover:text-primary">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 text-sm text-muted">By {post.author.name}</p>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{post.excerpt}</p>
        <div className="mt-auto flex items-center gap-4 pt-6 text-xs font-semibold text-muted">
          <span aria-label={`${post.likesCount} likes`}>♥ {post.likesCount}</span>
          <span aria-label={`${post.commentsCount} comments`}>💬 {post.commentsCount}</span>
          <Link href={`/blog/${post.id}`} className="ml-auto text-primary hover:underline">
            Read story →
          </Link>
        </div>
      </article>
    </Card>
  );
}
