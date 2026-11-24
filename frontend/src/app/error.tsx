"use client";

// Shown when a page crashes or the backend can't be reached (GEN-16). Each route segment may add its own error.tsx.
import { Button, ErrorState } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      message={error.message || "Please try again in a moment."}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
