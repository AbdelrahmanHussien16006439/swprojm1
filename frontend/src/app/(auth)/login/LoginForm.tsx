"use client";

// Login (ACC-04, ACC-05, ACC-10). The backend sets the httpOnly cookies; we only reload the user and redirect.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSafeNext, roleHome } from "@/lib/auth/routes";
import { Button, Card, FormErrors, FormField, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/login", { email, password }, { redirectOn401: false });
      const user = await refresh();
      if (!user) throw new Error("Login failed. Please try again.");
      const target = user.mustChangePassword
        ? "/change-password"
        : isSafeNext(next)
          ? next
          : roleHome(user.role);
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err); // invalid credentials, lockout (ACC-05) or suspended — message comes from the backend
      setBusy(false);
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Log in</h1>
      {next && <p className="mt-1 text-sm text-muted">Log in to continue.</p>}
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormErrors error={error} />
        <FormField label="Email" htmlFor="email" required>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="Password" htmlFor="password" required>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FormField>
        <Button type="submit" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        No account yet?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
