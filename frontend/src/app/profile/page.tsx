// My profile (ACC-09, ACC-11, ACC-12). Dynamic SSR: the page shows the logged-in user's own data.
import { serverApi } from "@/lib/api/server";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { Badge, ButtonLink, Card, PageHeader, StatusBadge } from "@/components/ui";
import type { Role } from "@/types/api";
import { ProfileForm } from "./ProfileForm";
import { DeleteAccount } from "./DeleteAccount";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferredCurrency: string;
  role: Role;
  status: string;
  createdAt: string;
}

export default async function ProfilePage() {
  const profile = await serverApi.get<Profile>("/users/me");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Account" title={`Hey ${profile.name.split(" ")[0]}!`} description="Your details, your currency, your account." />

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <Card>
          <h2 className="text-xl font-bold">Personal details</h2>
          <ProfileForm profile={profile} />
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand text-2xl font-bold text-white shadow-md">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <p className="mt-3 break-all text-sm text-muted">{profile.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="violet">{ROLE_LABELS[profile.role]}</Badge>
              <StatusBadge status={profile.status} />
            </div>
            <p className="mt-3 text-xs text-muted">Member since {formatDate(profile.createdAt)}</p>
          </Card>
          <Card>
            <h2 className="font-bold">Password</h2>
            <p className="mt-1 text-sm text-muted">Change it any time.</p>
            <ButtonLink href="/change-password" variant="secondary" size="sm" className="mt-3">
              Change password
            </ButtonLink>
          </Card>
        </div>
      </div>

      {profile.role === "user" && <DeleteAccount />}
    </div>
  );
}
