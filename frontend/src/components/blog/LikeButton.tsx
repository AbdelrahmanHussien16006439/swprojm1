"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { Button, FormErrors } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/routes";

export function LikeButton({ postId, initialLikesCount, initialLikedByMe }: { postId: string; initialLikesCount: number; initialLikedByMe: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLikedByMe);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ likesCount: number; likedByMe: boolean }>(`/posts/${postId}`, { redirectOn401: false })
      .then((post) => {
        if (!active) return;
        setLikesCount(post.likesCount);
        setLiked(post.likedByMe);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [postId]);

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
