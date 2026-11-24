"use client";

// Edit name, phone and preferred currency (ACC-09). The backend checks that the currency is supported.
// ⏳ Member 5: replace the currency text box with <CurrencySelect> once components/reference exists.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button, FormErrors, FormField, Input, fieldError } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import type { Profile } from "./page";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [currency, setCurrency] = useState(profile.preferredCurrency);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const changed = name !== profile.name || phone !== (profile.phone ?? "") || currency !== profile.preferredCurrency;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (name !== profile.name) body.name = name.trim();
      if (phone !== (profile.phone ?? "")) body.phone = phone.trim();
      if (currency !== profile.preferredCurrency) body.preferredCurrency = currency.trim().toUpperCase();
      await api.patch("/users/me", body);
      await refresh(); // the navbar shows the new name
      toast.success("Profile saved");
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <FormErrors error={error} fields={["name", "phone", "preferredCurrency", "currency"]} />
      <FormField label="Full name" htmlFor="name" required error={fieldError(error, "name")}>
        <Input id="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Phone number" htmlFor="phone" hint="Optional, e.g. +20 100 123 4567" error={fieldError(error, "phone")}>
        <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <FormField
        label="Preferred currency"
        htmlFor="currency"
        hint="3-letter code like USD, EUR or EGP — used for itinerary budgets."
        error={fieldError(error, "preferredCurrency") ?? fieldError(error, "currency")}
      >
        <Input id="currency" maxLength={3} className="uppercase" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={busy} disabled={!changed}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
