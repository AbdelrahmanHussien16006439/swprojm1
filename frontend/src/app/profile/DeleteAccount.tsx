"use client";

// Delete (deactivate) my account (ACC-12). The backend refuses while the user has upcoming confirmed bookings,
// and the ConfirmDialog shows that message. On success the backend clears the cookies.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button, Card } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  async function deleteAccount() {
    await api.delete("/users/me", { confirm: true });
    await refresh(); // the cookies are gone, so the app now sees a guest
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="mt-6 border-danger/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-danger">Delete my account</h2>
          <p className="mt-1 text-sm text-muted">
            Not possible while you have upcoming confirmed bookings. Your posts will show as &quot;Deleted user&quot;.
          </p>
        </div>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        danger
        title="Delete your account?"
        message="You will be logged out and won't be able to log in again with this account."
        confirmLabel="Yes, delete it"
        onConfirm={deleteAccount}
        onCancel={() => setOpen(false)}
      />
    </Card>
  );
}
