"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button, FormErrors, FormField, Input, Select, Textarea, fieldError } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ImageUploader } from "@/components/uploads";
import type { BlogImage, BlogPost } from "./types";

type PostStatus = "draft" | "published";

interface PostEditorProps {
  mode: "new" | "edit";
  initialPost?: Pick<BlogPost, "id" | "title" | "body" | "status" | "tags" | "images">;
}

function splitTags(value: string): string[] {
  return value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

export function PostEditor({ mode, initialPost }: PostEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [postId, setPostId] = useState(initialPost?.id);
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [body, setBody] = useState(initialPost?.body ?? "");
  const [status, setStatus] = useState<PostStatus>(initialPost?.status === "published" ? "published" : "draft");
  const [tags, setTags] = useState(initialPost?.tags.join(", ") ?? "");
  const [images, setImages] = useState<BlogImage[]>(initialPost?.images ?? []);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const parsedTags = useMemo(() => splitTags(tags), [tags]);
  const tagError = parsedTags.length > 5
    ? "tags must contain at most 5 items"
    : parsedTags.find((tag) => tag.length > 30)
      ? "each tag must be at most 30 characters"
      : undefined;

  const save = async () => {
    if (!title.trim() || !body.trim() || tagError) {
      setError(new Error(!title.trim() ? "title is required" : !body.trim() ? "body is required" : tagError));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { title: title.trim(), body: body.trim(), status, tags: parsedTags };
      if (postId) {
        await api.patch(`/posts/${postId}`, payload);
        toast.success("Post saved.");
      } else {
        const created = await api.post<{ id: string }>("/posts", payload);
        setPostId(created.id);
        toast.success("Post created. You can now add images.");
        router.replace(`/blog/${created.id}/edit`);
      }
    } catch (saveError) {
      setError(saveError);
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.upload<{ image: BlogImage }>(`/posts/${postId}/images`, formData);
    return response.image;
  };

  const removeImage = (image: BlogImage) => api.delete(`/posts/${postId}/images/${image.id}`).then(() => undefined);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-primary">📝 Blog editor</p>
        <h1 className="mt-1 text-3xl font-bold">{mode === "new" ? "Create a post" : "Edit post"}</h1>
        <p className="mt-2 text-muted">Save a draft while you work, or publish when your story is ready.</p>
      </header>
      <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <FormErrors error={error} fields={["title", "body", "status", "tags"]} />
        <FormField label="Title" htmlFor="post-title" required error={fieldError(error, "title")}>
          <Input id="post-title" value={title} required maxLength={200} onChange={(event) => setTitle(event.target.value)} disabled={busy} />
        </FormField>
        <FormField label="Body" htmlFor="post-body" required error={fieldError(error, "body")}>
          <Textarea id="post-body" value={body} required rows={12} onChange={(event) => setBody(event.target.value)} disabled={busy} />
        </FormField>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Status" htmlFor="post-status" error={fieldError(error, "status")}>
            <Select id="post-status" value={status} onChange={(event) => setStatus(event.target.value as PostStatus)} disabled={busy}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>
          <FormField label="Tags" htmlFor="post-tags" hint="Separate tags with commas; up to 5 tags, 30 characters each." error={fieldError(error, "tags") ?? tagError}>
            <Input id="post-tags" value={tags} placeholder="egypt, food, weekend" disabled={busy} onChange={(event) => setTags(event.target.value)} />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={busy}>{mode === "new" ? "Create post" : "Save changes"}</Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/blog/mine")} disabled={busy}>Cancel</Button>
        </div>
      </form>
      {postId ? (
        <section className="space-y-3 border-t border-border pt-6">
          <div>
            <h2 className="text-xl font-bold">Images</h2>
            <p className="mt-1 text-sm text-muted">Images are attached to this saved post.</p>
          </div>
          <ImageUploader value={images} onChange={setImages} onUpload={uploadImage} onRemove={removeImage} maxCount={5} />
        </section>
      ) : (
        <p className="rounded-2xl bg-primary-soft px-4 py-3 text-sm text-muted">Save the post first to add images.</p>
      )}
    </div>
  );
}
