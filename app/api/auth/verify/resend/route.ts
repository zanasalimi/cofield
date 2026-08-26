import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/server";
import { issueCode } from "@/auth/verification";
import { rateLimit } from "@/auth/rate-limit";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.emailVerifiedAt !== null) return NextResponse.json({ ok: true, alreadyVerified: true });

  // Each send is mail to somebody's inbox, so the account is capped as well as
  // the per-code cooldown: an address should not be flooded by whoever claimed
  // it, and it is not the sender's own inbox that suffers.
  if (!rateLimit(`verify:resend:${user.id}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "You've asked for a few codes already. Try again in a little while." },
      { status: 429 },
    );
  }

  const result = await issueCode(user);
  if (!result.sent) {
    return NextResponse.json(
      { error: `Hang on a moment before asking for another.`, retryAfterMs: result.retryAfterMs },
      { status: 429 },
    );
  }
  return NextResponse.json({ ok: true });
}
