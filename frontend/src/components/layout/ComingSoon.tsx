// Placeholder page body. Each member replaces their placeholders with real pages (TEAM_PLAN M2.3).
import { Badge } from "@/components/ui";

export function ComingSoon({ title, owner, requirements }: { title: string; owner: string; requirements?: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-primary/25 bg-surface/70 px-6 py-16 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">🚧</div>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">This page is being built — stay tuned!</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Badge tone="violet">{owner}</Badge>
        {requirements && <Badge tone="pink">{requirements}</Badge>}
      </div>
    </div>
  );
}
