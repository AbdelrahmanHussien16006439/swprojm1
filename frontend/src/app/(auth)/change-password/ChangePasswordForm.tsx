"use client";

// Change password (ACC-08). Also used when an admin set a temporary password (mustChangePassword):
// the AuthProvider keeps the user on this page until the password is changed.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { roleHome } from "@/lib/auth/routes";
import { isValidPassword, PASSWORD_HINT } from "@/lib/labels";
import { Button, Card, FormErrors, FormField, Input, fieldError } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

export function ChangePasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = "currentPassword is required";
    if (!isValidPassword(newPassword)) errors.newPassword = `newPassword: ${PASSWORD_HINT}`;
    if (newPassword !== confirm) errors.confirm = "The two new passwords don't match";
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    try {
      await api.patch("/auth/change-password", { currentPassword, newPassword });
      const me = await refresh();
      toast.success("Password changed");
      router.replace(me ? roleHome(me.role) : "/");
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const errorFor = (field: string) => localErrors[field] ?? fieldError(error, field);

  return (
    <Card>
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl shadow-md" aria-hidden="true">
        🔐
      </div>
      <h1 className="text-3xl font-bold">Change password</h1>
      {user?.mustChangePassword ? (
        <p className="mt-3 rounded-2xl bg-warning-soft px-4 py-2 text-sm font-medium text-warning">
          You&apos;re using a temporary password. Pick a new one to continue.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">You&apos;ll stay logged in here; other devices are logged out.</p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormErrors error={error} fields={["currentPassword", "newPassword"]} />
        <FormField label="Current password" htmlFor="currentPassword" required error={errorFor("currentPassword")}>
          <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </FormField>
        <FormField label="New password" htmlFor="newPassword" required hint={PASSWORD_HINT} error={errorFor("newPassword")}>
          <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </FormField>
        <FormField label="Repeat new password" htmlFor="confirm" required error={localErrors.confirm}>
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!user?.mustChangePassword && (
            <Button variant="secondary" onClick={() => router.back()} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={busy}>
            Save new password
          </Button>
        </div>
      </form>
    </Card>
  );
}
