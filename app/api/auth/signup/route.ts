import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail, createSessionToken, setSessionCookie, publicUser } from "@/auth/server";
import { rateLimit, clientIp } from "@/auth/rate-limit";
import { issueCode } from "@/auth/verification";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  if (!rateLimit(`signup:ip:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  // Signup also runs the KDF, and the per-IP key is only as good as the proxy
  // in front of it, so cap the total as well.
  if (!rateLimit("signup:all", 100, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
  const user = await createUser(email, password, name);
  await setSessionCookie(createSessionToken(user.id));
  // Signing in immediately is deliberate: the account exists, it just cannot do
  // the one thing that trusts the address yet. Failing to mail must not strand
  // someone outside their own new account, so the code is offered again on the
  // verify screen.
  await issueCode(user);
  return NextResponse.json({ user: publicUser(user), needsVerification: true });
}
