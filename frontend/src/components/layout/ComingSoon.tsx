// Placeholder page body. Each member replaces their placeholders with real pages (TEAM_PLAN M2.3).
import { Card } from "@/components/ui";

export function ComingSoon({ title, owner, requirements }: { title: string; owner: string; requirements?: string }) {
  return (
    <Card className="text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Coming soon — {owner}
        {requirements ? ` (${requirements})` : ""}
      </p>
    </Card>
  );
}
