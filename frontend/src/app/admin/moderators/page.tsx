// Create a moderator (ACC-13).
import { Card, PageHeader } from "@/components/ui";
import { CreateModeratorForm } from "./CreateModeratorForm";

export const metadata = { title: "New moderator" };

export default function ModeratorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="🧑‍✈️ Moderators"
        title="New moderator"
        description="A moderator manages exactly one airline or one hotel. They must change the temporary password at first login."
        backHref="/admin/accounts"
        backLabel="Accounts"
      />
      <Card className="max-w-2xl">
        <CreateModeratorForm />
      </Card>
    </>
  );
}
