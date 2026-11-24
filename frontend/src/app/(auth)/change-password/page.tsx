import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <ChangePasswordForm />
    </div>
  );
}
