"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@embertoast/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "@/components/icons";

type Errors = Partial<Record<"name" | "email" | "password", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validate(fd: FormData): Errors {
    const next: Errors = {};
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (isSignup && !String(fd.get("name") ?? "").trim()) next.name = "Tell us your name.";
    if (!email) next.email = "Enter your email.";
    else if (!EMAIL_RE.test(email)) next.email = "That email doesn't look right.";
    if (!password) next.password = "Enter your password.";
    else if (isSignup && password.length < 8) next.password = "Use at least 8 characters.";
    return next;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const found = validate(fd);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const body = isSignup
      ? { name: fd.get("name"), email: fd.get("email"), password: fd.get("password") }
      : { email: fd.get("email"), password: fd.get("password") };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        const message = j.error ?? (isSignup ? "Couldn't create your account." : "Couldn't sign you in.");
        setErrors({ email: isSignup ? undefined : message });
        toast.error(message);
        setLoading(false);
        return;
      }
      toast.success(isSignup ? "Account created — welcome to Cofield." : "Signed in.");
      router.push("/boards");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-ink">{isSignup ? "Create your account" : "Welcome back"}</h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        {isSignup ? "Start a board and bring your team in." : "Sign in to pick up where you left off."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {isSignup && (
          <Field label="Name" error={errors.name}>
            <Input id="name" name="name" autoComplete="name" placeholder="Ada Lovelace" aria-invalid={!!errors.name} className="h-11" />
          </Field>
        )}
        <Field label="Email" error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} className="h-11" />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              aria-invalid={!!errors.password}
              className="h-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </Field>

        <Button type="submit" disabled={loading} className="h-11 w-full text-[0.95rem] font-semibold">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {isSignup ? "Creating account…" : "Signing in…"}
            </span>
          ) : isSignup ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {isSignup ? "Already have an account? " : "New to Cofield? "}
        <Link href={isSignup ? "/signin" : "/signup"} className="font-semibold text-ink underline-offset-4 hover:underline">
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-ink">{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-cursor-coral">{error}</p> : null}
    </div>
  );
}
