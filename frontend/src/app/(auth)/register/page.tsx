import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Sign up", description: "Create a free TravelMate account." };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<LoadingState />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
