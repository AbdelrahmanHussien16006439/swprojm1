"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { Button, FormErrors, Input, Select } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type ReportAction = "dismiss" | "hide" | "delete";
function useAdminAction() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      const message = typeof result === "object" && result !== null && "message" in result && typeof result.message === "string" ? result.message : success;
      toast.success(message);
      router.refresh();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, run };
}

export function ReportActions({ reportId, targetType }: { reportId: string; targetType: string }) {
  const { busy, error, setError, run } = useAdminAction();
  const [dialog, setDialog] = useState<ReportAction | null>(null);

  const close = () => { if (!busy) { setDialog(null); setError(null); } };
  const resolve = () => run(() => api.patch(`/admin/reports/${reportId}`, { action: dialog }), `Report for ${targetType} resolved`).then(close);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDialog("dismiss")}>Dismiss</Button>
        <Button size="sm" variant="secondary" onClick={() => setDialog("hide")}>Hide</Button>
        <Button size="sm" variant="danger" onClick={() => setDialog("delete")}>Delete</Button>
      </div>
      <ConfirmDialog
        open={dialog !== null}
        danger={dialog === "delete"}
        title={`${dialog === "dismiss" ? "Dismiss" : dialog === "hide" ? "Hide" : "Delete"} this report?`}
        message={<><p>This will resolve the report for the {targetType}.</p><FormErrors error={error} /></>}
        confirmLabel={dialog === "dismiss" ? "Dismiss" : dialog === "hide" ? "Hide" : "Delete"}
        onConfirm={resolve}
        onCancel={close}
      />
    </>
  );
}

export function ContentActions() {
  const { busy, error, run } = useAdminAction();
  const [type, setType] = useState("post");
  const [id, setId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const hide = () => run(() => api.patch(`/admin/content/${type}/${id.trim()}/hide`, { hidden: true }), "Content hidden").catch(() => undefined);
  const unhide = () => run(() => api.patch(`/admin/content/${type}/${id.trim()}/hide`, { hidden: false }), "Content restored").catch(() => undefined);
  const remove = () => run(() => api.delete(`/admin/content/${type}/${id.trim()}`), "Content deleted").then(() => setDialogOpen(false));
  const valid = id.trim().length > 0;

  return (
    <div className="max-w-2xl space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <label className="space-y-1 text-sm font-semibold"><span>Content type</span><Select value={type} onChange={(e) => setType(e.target.value)}><option value="post">Post</option><option value="comment">Comment</option><option value="review">Review</option><option value="itinerary">Itinerary</option></Select></label>
        <label className="space-y-1 text-sm font-semibold"><span>Content ID</span><Input value={id} onChange={(e) => setId(e.target.value)} placeholder="MongoDB ID" /></label>
      </div>
      <FormErrors error={error} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={!valid || busy} onClick={hide}>Hide</Button>
        <Button variant="secondary" disabled={!valid || busy} onClick={unhide}>Unhide</Button>
        <Button variant="danger" disabled={!valid || busy} onClick={() => setDialogOpen(true)}>Delete</Button>
      </div>
      <ConfirmDialog open={dialogOpen} danger title="Delete this content?" message={`This permanently deletes the selected ${type}.`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setDialogOpen(false)} />
    </div>
  );
}

export function ProviderActions() {
  const { busy, error, setError, run } = useAdminAction();
  const [type, setType] = useState("airline");
  const [id, setId] = useState("");
  const [action, setAction] = useState<"deactivate" | "reactivate" | null>(null);
  const valid = id.trim().length > 0;
  const close = () => { if (!busy) { setAction(null); setError(null); } };
  const execute = () => run(() => api.patch(`/admin/providers/${type}/${id.trim()}/${action}`), `Provider ${action === "deactivate" ? "deactivated" : "reactivated"}`).then(close);

  return (
    <div className="max-w-2xl space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <label className="space-y-1 text-sm font-semibold"><span>Provider type</span><Select value={type} onChange={(e) => setType(e.target.value)}><option value="airline">Airline</option><option value="hotel">Hotel</option></Select></label>
        <label className="space-y-1 text-sm font-semibold"><span>Provider ID</span><Input value={id} onChange={(e) => setId(e.target.value)} placeholder="MongoDB ID" /></label>
      </div>
      <FormErrors error={error} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={!valid || busy} onClick={() => setAction("deactivate")}>Deactivate</Button>
        <Button variant="secondary" disabled={!valid || busy} onClick={() => setAction("reactivate")}>Reactivate</Button>
      </div>
      <ConfirmDialog open={action !== null} title={`${action === "deactivate" ? "Deactivate" : "Reactivate"} this provider?`} message={`The backend will ${action === "deactivate" ? "hide" : "restore"} this ${type}.`} confirmLabel={action === "deactivate" ? "Deactivate" : "Reactivate"} onConfirm={execute} onCancel={close} />
    </div>
  );
}
