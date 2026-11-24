import { PageHeader } from "@/components/ui";
import { ContentActions } from "../ModerationActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content moderation" };

export default function ContentPage() {
  return <div><PageHeader eyebrow="🧹 Moderation" title="Content" description="Hide, restore or permanently delete a post, comment, review or itinerary by ID." /><ContentActions /></div>;
}
