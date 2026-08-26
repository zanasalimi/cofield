import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyForm } from "@/components/auth/VerifyForm";

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  // Nothing to do here once the address is proven.
  if (user.emailVerifiedAt !== null) redirect("/boards");

  return (
    <AuthShell>
      <div className="flex flex-col items-center text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Check your email</h2>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">
          We sent a 6-digit code to <span className="font-medium text-ink">{user.email}</span>. Enter it
          below to finish setting up your account.
        </p>
        <div className="mt-7">
          <VerifyForm email={user.email} />
        </div>
        <p className="mt-8 max-w-xs text-xs leading-relaxed text-ink-soft">
          No mail server is configured in development, so the code is printed in the terminal running{" "}
          <code className="rounded bg-ink/5 px-1 py-0.5 font-mono">pnpm dev</code>.
        </p>
      </div>
    </AuthShell>
  );
}
