import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail, createSessionToken, setSessionCookie, publicUser } from "@/auth/server";
import { rateLimit, clientIp } from "@/auth/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  if (!rateLimit(`signup:${clientIp(req)}`, 5, 60_000)) {
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
  return NextResponse.json({ user: publicUser(user) });
}
