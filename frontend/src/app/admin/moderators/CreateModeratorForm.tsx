"use client";

// Create an airline or hotel moderator (ACC-13). The backend checks the provider exists (404 otherwise).
// ⏳ Members 3 and 5: once GET /api/airlines and GET /api/hotels (admin lists) exist, replace the
// provider id box with a dropdown of airlines / hotels.
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { isValidPassword, PASSWORD_HINT } from "@/lib/labels";
import { Button, FormErrors, FormField, Input, Select, fieldError } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

type ModeratorRole = "airline_moderator" | "hotel_moderator";

const EMPTY = { name: "", email: "", role: "airline_moderator" as ModeratorRole, providerId: "", temporaryPassword: "" };

export function CreateModeratorForm() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState<{ name: string; email: string } | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "email must be a valid email address";
    if (!/^[a-f0-9]{24}$/i.test(form.providerId.trim())) errors.providerId = "providerId must be a valid id (24 characters)";
    if (!isValidPassword(form.temporaryPassword)) errors.temporaryPassword = `temporaryPassword: ${PASSWORD_HINT}`;
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    try {
      await api.post("/admin/moderators", { ...form, name: form.name.trim(), providerId: form.providerId.trim() });
      toast.success(`Moderator ${form.name} created`);
      setCreated({ name: form.name, email: form.email });
      setForm(EMPTY);
    } catch (err) {
      setError(err); // 404 provider not found, 409 email taken...
    } finally {
      setBusy(false);
    }
  }

  const errorFor = (field: string) => localErrors[field] ?? fieldError(error, field);
  const provider = form.role === "airline_moderator" ? "airline" : "hotel";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {created && (
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {created.name} ({created.email}) can now log in with the temporary password.{" "}
          <Link href="/admin/accounts" className="underline">See accounts</Link>
        </p>
      )}
      <FormErrors error={error} fields={["name", "email", "providerId", "temporaryPassword"]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="name" required error={errorFor("name")}>
          <Input id="name" maxLength={100} value={form.name} onChange={set("name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" required error={errorFor("email")}>
          <Input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="off" />
        </FormField>
      </div>
      <FormField label="Moderates" htmlFor="role" required>
        <Select id="role" value={form.role} onChange={set("role")}>
          <option value="airline_moderator">An airline</option>
          <option value="hotel_moderator">A hotel</option>
        </Select>
      </FormField>
      <FormField
        label={`${provider === "airline" ? "Airline" : "Hotel"} id`}
        htmlFor="providerId"
        required
        hint={`The id of the ${provider} (see the ${provider === "airline" ? "Airlines" : "Hotels"} admin page).`}
        error={errorFor("providerId")}
      >
        <Input id="providerId" className="font-mono" value={form.providerId} onChange={set("providerId")} autoComplete="off" />
      </FormField>
      <FormField label="Temporary password" htmlFor="temporaryPassword" required hint={PASSWORD_HINT} error={errorFor("temporaryPassword")}>
        <Input id="temporaryPassword" value={form.temporaryPassword} onChange={set("temporaryPassword")} autoComplete="off" />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>Create moderator</Button>
      </div>
    </form>
  );
}
