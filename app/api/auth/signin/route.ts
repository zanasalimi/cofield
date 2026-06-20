import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, verifyPassword, createSessionToken, setSessionCookie, publicUser } from "@/auth/server";
import { rateLimit, clientIp } from "@/auth/rate-limit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  if (!rateLimit(`signin:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  await setSessionCookie(createSessionToken(user.id));
  return NextResponse.json({ user: publicUser(user) });
}
