"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { Button, FormErrors } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/routes";

export function LikeButton({ postId, initialLikesCount }: { postId: string; initialLikesCount: number }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const toggleLike = async () => {
    if (!user) {
      router.push(loginUrl(pathname));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = liked
        ? await api.delete<{ likesCount: number }>(`/posts/${postId}/like`)
        : await api.post<{ likesCount: number }>(`/posts/${postId}/like`);
      setLiked(!liked);
      setLikesCount(response.likesCount);
    } catch (likeError) {
      setError(likeError);
      // The backend's 409 means this browser session already liked the post.
      if (likeError instanceof ApiError && likeError.status === 409) setLiked(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant={liked ? "secondary" : "primary"} onClick={() => void toggleLike()} loading={busy} disabled={loading}>
        {liked ? "♥ Liked" : "♡ Like"} · {likesCount}
      </Button>
      <FormErrors error={error} />
    </div>
  );
}
