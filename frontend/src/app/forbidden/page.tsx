import { ButtonLink, EmptyState } from "@/components/ui";

export const metadata = { title: "Not allowed" };

export default function ForbiddenPage() {
  return (
    <EmptyState
      title="You don't have access to this page"
      message="This page is for a different type of account."
      action={<ButtonLink href="/">Go to the home page</ButtonLink>}
    />
  );
}
