import { AuthForm } from "@/components/auth/AuthForm";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper p-6">
      <AuthForm mode="signup" />
    </main>
  );
}
