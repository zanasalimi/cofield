import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/boards");
  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
