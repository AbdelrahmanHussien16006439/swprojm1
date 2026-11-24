import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="The page you are looking for doesn't exist or is no longer available."
      action={<ButtonLink href="/">Go to the home page</ButtonLink>}
    />
  );
}
