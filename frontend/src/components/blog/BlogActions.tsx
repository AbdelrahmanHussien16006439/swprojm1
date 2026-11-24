"use client";

import { ButtonLink } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";

export function BlogActions() {
  const { user, loading } = useAuth();

  if (loading || user?.role !== "user") return null;

  return (
    <>
      <ButtonLink href="/blog/new">Write a story</ButtonLink>
      <ButtonLink href="/blog/mine" variant="secondary">My posts</ButtonLink>
    </>
  );
}
