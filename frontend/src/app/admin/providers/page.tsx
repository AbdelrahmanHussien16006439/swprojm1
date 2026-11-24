import { PageHeader } from "@/components/ui";
import { ProviderActions } from "../ModerationActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Providers" };

export default function ProvidersPage() {
  return <div><PageHeader eyebrow="🔌 Providers" title="Airlines & hotels" description="Deactivate or reactivate a provider by type and ID. The backend result will be shown after each action." /><ProviderActions /></div>;
}
