import Image from "next/image";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { BlogComment, BlogImage, BlogPost } from "./types";

export function PostDetail({ post }: { post: BlogPost }) {
  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {post.tags.map((tag) => (
            <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
              <Badge tone="violet">#{tag}</Badge>
            </Link>
          ))}
        </div>
        <h1 className="text-4xl font-bold sm:text-5xl">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>By</span>
          <Link href={`/authors/${post.author.id}`} className="font-semibold text-primary hover:underline">{post.author.name}</Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      </header>

      {post.images.length > 0 && <ImageGallery images={post.images} title={post.title} />}

      <div className="rounded-3xl border border-border bg-surface p-5 text-base leading-8 shadow-sm sm:p-8">
        <p className="whitespace-pre-wrap">{post.body}</p>
      </div>
    </article>
  );
}

function ImageGallery({ images, title }: { images: BlogImage[]; title: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {images.map((image) => (
        <div key={image.id} className="overflow-hidden rounded-3xl border border-border bg-surface">
          <Image src={image.url} alt={`${title} image`} width={1000} height={700} unoptimized className="max-h-[32rem] w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export function CommentPreview({ comment }: { comment: BlogComment }) {
  return (
    <Card>
      <p className="whitespace-pre-wrap text-sm leading-6">{comment.text}</p>
      <p className="mt-3 text-xs text-muted">{comment.author.name} · {formatDate(comment.date)}</p>
    </Card>
  );
}
