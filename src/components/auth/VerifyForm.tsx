/**
 * The six-digit gate.
 *
 * A code is short enough that asking someone to type it and then press a button
 * is one step too many, so a complete code submits itself. Everything else is
 * the boring part done properly: the field stays usable while a request is in
 * flight is not true, so it locks; a wrong code clears itself and refocuses so
 * the next attempt starts clean; and the resend button says when it can be used
 * again rather than silently refusing.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@embertoast/react";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/icons";

const RESEND_SECONDS = 30;

export function VerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  // Guards against the auto-submit firing twice for one complete code, which a
  // re-render between keystroke and response would otherwise allow.
  const submitting = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = useCallback(
    async (value: string) => {
      if (submitting.current || value.length !== 6) return;
      submitting.current = true;
      setChecking(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "That code did not work.");
          setCode("");
          return;
        }
        toast.success("Email verified. You're all set.");
        router.push("/boards");
        router.refresh();
      } catch {
        setError("Couldn't reach the server. Check your connection.");
      } finally {
        submitting.current = false;
        setChecking(false);
      }
    },
    [router],
  );

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't send a new code.");
        return;
      }
      setCode("");
      setCooldown(RESEND_SECONDS);
      toast.success("New code sent.");
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form
      className="flex flex-col items-center"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(code);
      }}
    >
      <InputOTP
        maxLength={6}
        value={code}
        onChange={(next) => {
          setCode(next);
          setError(null);
          // A complete code needs no confirming click.
          if (next.length === 6) void submit(next);
        }}
        disabled={checking}
        autoFocus
        aria-label={`Verification code sent to ${email}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "code-error" : undefined}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      <div className="mt-3 flex h-5 items-center gap-2 text-sm">
        {checking ? (
          <span className="flex items-center gap-1.5 text-ink-soft">
            <Loader2 className="size-3.5 animate-spin" />
            Checking
          </span>
        ) : error ? (
          <span id="code-error" role="alert" className="text-cursor-coral">
            {error}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-1.5 text-sm text-ink-soft">
        <span>Didn&apos;t get it?</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-1.5 py-1 font-semibold text-ink"
          disabled={cooldown > 0 || resending}
          onClick={() => void resend()}
        >
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
        </Button>
      </div>
    </form>
  );
}
