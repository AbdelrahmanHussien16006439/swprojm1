"use client";

// Row actions: suspend (with optional reason), reactivate, reset password (ACC-15, ACC-16, ACC-07a).
// Admin and deactivated accounts can't be changed (the backend refuses too).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { isValidPassword, PASSWORD_HINT } from "@/lib/labels";
import { Button, FormErrors, FormField, Input, Textarea } from "@/components/ui";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { AccountSummary } from "./page";

type Dialog = "suspend" | "reactivate" | "reset" | null;

export function AccountActions({ account }: { account: AccountSummary }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (account.role === "admin" || account.status === "deactivated") {
    return <span className="text-xs text-muted">—</span>;
  }

  const close = () => {
    setDialog(null);
    setReason("");
    setTempPassword("");
    setError(null);
  };

  const done = (message: string) => {
    toast.success(message);
    close();
    router.refresh();
  };

  async function suspend() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/accounts/${account.id}/suspend`, reason.trim() ? { reason: reason.trim() } : {});
      done(`${account.name} is suspended`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function reactivate() {
    await api.patch(`/admin/accounts/${account.id}/reactivate`);
    done(`${account.name} is active again`);
  }

  async function resetPassword() {
    if (!isValidPassword(tempPassword)) {
      setError(new Error(`Temporary password: ${PASSWORD_HINT}`));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/users/${account.id}/reset-password`, { temporaryPassword: tempPassword });
      done(`Temporary password set for ${account.name}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-2">
      {account.status === "suspended" ? (
        <Button size="sm" variant="secondary" onClick={() => setDialog("reactivate")}>Reactivate</Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setDialog("suspend")}>Suspend</Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => setDialog("reset")}>Reset password</Button>

      <Modal
        open={dialog === "suspend"}
        title={`Suspend ${account.name}?`}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={suspend} loading={busy}>Suspend</Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-muted">They are logged out right away and can&apos;t log in. Their bookings and content stay.</p>
          <FormErrors error={error} />
          <FormField label="Reason (optional)" htmlFor="reason" hint="Saved in the audit log. Max 500 characters.">
            <Textarea id="reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === "reactivate"}
        title={`Reactivate ${account.name}?`}
        message="They will be able to log in again."
        confirmLabel="Reactivate"
        onConfirm={reactivate}
        onCancel={close}
      />

      <Modal
        open={dialog === "reset"}
        title={`Reset password for ${account.name}`}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
            <Button onClick={resetPassword} loading={busy}>Set temporary password</Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-muted">Give them this password privately. They must choose a new one when they log in.</p>
          <FormErrors error={error} />
          <FormField label="Temporary password" htmlFor="tempPassword" hint={PASSWORD_HINT}>
            <Input id="tempPassword" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} autoComplete="off" />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
