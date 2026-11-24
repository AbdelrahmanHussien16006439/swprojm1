import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<LoadingState />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
