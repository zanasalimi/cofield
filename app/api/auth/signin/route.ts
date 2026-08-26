import { NextResponse } from "next/server";
import { z } from "zod";
import { ABSENT_USER_HASH, findUserByEmail, verifyPassword, createSessionToken, setSessionCookie, publicUser } from "@/auth/server";
import { rateLimit, clientIp } from "@/auth/rate-limit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

const TOO_MANY = { error: "Too many attempts. Try again in a minute." };

export async function POST(req: Request) {
  // An IP is only as trustworthy as the proxy in front of it, so it is the
  // weakest of the three keys rather than the only one.
  if (!rateLimit(`signin:ip:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json(TOO_MANY, { status: 429 });
  }
  // Every attempt runs scrypt, so an unbounded stream of them is a way to eat
  // the CPU whether or not any password is ever guessed.
  if (!rateLimit("signin:all", 300, 60_000)) {
    return NextResponse.json(TOO_MANY, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Keyed on the account being attacked. Unlike an IP this is not something the
  // caller can rotate, so guessing one account's password stays bounded however
  // many addresses the requests appear to come from.
  if (!rateLimit(`signin:account:${email.toLowerCase()}`, 10, 60_000)) {
    return NextResponse.json(TOO_MANY, { status: 429 });
  }

  const user = findUserByEmail(email);
  // Runs the KDF either way; see ABSENT_USER_HASH.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? ABSENT_USER_HASH);
  if (!user || !passwordOk) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  await setSessionCookie(createSessionToken(user.id));
  return NextResponse.json({ user: publicUser(user) });
}
