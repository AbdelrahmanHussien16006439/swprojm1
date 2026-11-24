export interface BlogPostSummary {
  id: string;
  title: string;
  author: { id: string; name: string };
  date: string;
  excerpt: string;
  likesCount: number;
  commentsCount: number;
}

export interface BlogImage {
  id: string;
  url: string;
}

export interface BlogComment {
  id: string;
  text: string;
  date: string;
  author: { id: string; name: string };
  isHidden?: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  author: { id: string; name: string };
  date: string;
  status: "draft" | "published";
  body: string;
  tags: string[];
  images: BlogImage[];
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  comments: BlogComment[];
}
