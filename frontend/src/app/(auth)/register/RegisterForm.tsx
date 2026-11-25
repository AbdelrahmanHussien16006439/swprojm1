"use client";

// Register (ACC-01). The backend validates everything; we also check early so the user gets instant feedback.
// After signing up we log the user in straight away and send them back to where they were (ACC-10).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSafeNext, roleHome } from "@/lib/auth/routes";
import { isValidPassword, PASSWORD_HINT } from "@/lib/labels";
import { Button, Card, Checkbox, FormErrors, FormField, Input, Icon, fieldError } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptTerms: false });
  const [error, setError] = useState<unknown>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "email must be a valid email address";
    if (!isValidPassword(form.password)) errors.password = `password: ${PASSWORD_HINT}`;
    if (!form.acceptTerms) errors.acceptTerms = "You must accept the terms and conditions";
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await api.post("/auth/register", { ...form, name: form.name.trim() }, { redirectOn401: false });
      await api.post("/auth/login", { email: form.email, password: form.password }, { redirectOn401: false });
      const user = await refresh();
      router.replace(isSafeNext(next) ? next : user ? roleHome(user.role) : "/");
      router.refresh();
    } catch (err) {
      setError(err); // e.g. 409 "email already registered"
      setBusy(false);
    }
  }

  const errorFor = (field: string) => localErrors[field] ?? fieldError(error, field);

  return (
    <Card>
<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="userPlus" className="h-6 w-6" /></div>
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Book faster, save your trips and share your stories.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormErrors error={error} fields={["name", "email", "password", "acceptTerms"]} />
        <FormField label="Full name" htmlFor="name" required error={errorFor("name")}>
          <Input id="name" autoComplete="name" maxLength={100} value={form.name} onChange={set("name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" required error={errorFor("email")}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </FormField>
        <FormField label="Password" htmlFor="password" required hint={PASSWORD_HINT} error={errorFor("password")}>
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
        </FormField>
        <div className="space-y-1">
          <Checkbox
            id="acceptTerms"
            checked={form.acceptTerms}
            onChange={set("acceptTerms")}
            label="I accept the terms and the privacy policy"
          />
          {errorFor("acceptTerms") && <p className="text-sm text-danger">{errorFor("acceptTerms")}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create my account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
