export interface BlogPostSummary {
  id: string;
  title: string;
  author: { id: string; name: string };
  date: string;
  excerpt: string;
  likesCount: number;
  commentsCount: number;
}
