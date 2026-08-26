import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { checkCode } from "@/auth/verification";
import { rateLimit } from "@/auth/rate-limit";

const Body = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.") });

const MESSAGES: Record<string, string> = {
  "no-code": "That code has expired. Send yourself a new one.",
  expired: "That code has expired. Send yourself a new one.",
  "too-many": "Too many wrong tries. Send yourself a new code.",
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.emailVerifiedAt !== null) return NextResponse.json({ ok: true, alreadyVerified: true });

  // The code itself only allows ten guesses, but that counter lives beside the
  // code: without this, resend-then-guess in a loop would be unbounded.
  if (!rateLimit(`verify:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many tries. Wait a minute." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid code" }, { status: 400 });
  }

  const result = checkCode(user.id, parsed.data.code);
  if (result.ok) return NextResponse.json({ ok: true });

  if (result.reason === "wrong") {
    const left = result.remaining ?? 0;
    return NextResponse.json(
      {
        error: left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "That code is not right.",
        remaining: left,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: MESSAGES[result.reason] ?? "That code did not work." }, { status: 400 });
}
