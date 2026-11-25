// Placeholder page body. Each member replaces their placeholders with real pages (TEAM_PLAN M2.3).
import { Badge } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";

export function ComingSoon({ title, owner, requirements }: { title: string; owner: string; requirements?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon name="wrench" className="h-6 w-6" />
      </div>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">This page is under construction.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Badge tone="violet">{owner}</Badge>
        {requirements && <Badge tone="gray">{requirements}</Badge>}
      </div>
    </div>
  );
}
