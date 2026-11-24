"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button, Card, FormErrors, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/routes";
import { formatDate } from "@/lib/format";
import { ReportButton } from "@/components/reports";
import type { BlogComment } from "./types";

interface CommentMutationResponse {
  id: string;
  text: string;
  author: { id: string; name: string };
  createdAt: string;
}

function normalizeComment(comment: CommentMutationResponse): BlogComment {
  return { id: comment.id, text: comment.text, author: comment.author, date: comment.createdAt };
}

export function CommentsSection({ postId, initialComments }: { postId: string; initialComments: BlogComment[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const addComment = async () => {
    if (!user) {
      router.push(loginUrl(pathname));
      return;
    }
    if (!text.trim()) {
      setFormError(new Error("Comment cannot be empty."));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const comment = await api.post<CommentMutationResponse>(`/posts/${postId}/comments`, { text: text.trim() });
      setComments((current) => [...current, normalizeComment(comment)]);
      setText("");
    } catch (error) {
      setFormError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="comments-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="comments-heading" className="text-2xl font-bold">Comments <span className="text-muted">({comments.length})</span></h2>
      </div>
      <Card>
        <Textarea
          value={text}
          maxLength={500}
          rows={4}
          placeholder={user ? "Share your thoughts..." : "Log in to join the conversation"}
          disabled={busy}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => { if (!user) router.push(loginUrl(pathname)); }}
          aria-label="Comment text"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted">{text.length}/500 characters</span>
          <Button type="button" onClick={() => void addComment()} loading={busy}>Add comment</Button>
        </div>
        <div className="mt-3"><FormErrors error={formError} /></div>
      </Card>
      {comments.length === 0 ? (
        <p className="rounded-3xl border-2 border-dashed border-border px-6 py-10 text-center text-sm text-muted">No comments yet. Start the conversation.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} userId={user?.id} onUpdated={(updated) => setComments((current) => current.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setComments((current) => current.filter((item) => item.id !== id))} />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentItem({ comment, userId, onUpdated, onDeleted }: { comment: BlogComment; userId?: string; onUpdated: (comment: BlogComment) => void; onDeleted: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = userId === comment.author.id;

  const save = async () => {
    if (!text.trim()) {
      setError(new Error("Comment cannot be empty."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patch<CommentMutationResponse>(`/comments/${comment.id}`, { text: text.trim() });
      onUpdated(normalizeComment(updated));
      setEditing(false);
    } catch (updateError) {
      setError(updateError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/comments/${comment.id}`);
      onDeleted(comment.id);
      setConfirmDelete(false);
    } catch (deleteError) {
      setError(deleteError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      {editing ? (
        <Textarea value={text} maxLength={500} rows={3} disabled={busy} onChange={(event) => setText(event.target.value)} />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6">{comment.text}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{comment.author.name} · {formatDate(comment.date)}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          <ReportButton targetType="comment" targetId={comment.id} />
          {isOwner && !editing && <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
          {isOwner && editing && <Button type="button" size="sm" onClick={() => void save()} loading={busy}>Save</Button>}
          {isOwner && editing && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setText(comment.text); setError(null); }}>Cancel</Button>}
          {isOwner && !editing && <Button type="button" variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Delete</Button>}
        </span>
      </div>
      <div className="mt-3"><FormErrors error={error} /></div>
      <ConfirmDialog open={confirmDelete} danger title="Delete this comment?" message="This cannot be undone." confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </Card>
  );
}
