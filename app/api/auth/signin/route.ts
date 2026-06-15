import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, verifyPassword, createSessionToken, setSessionCookie, publicUser } from "@/auth/server";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  await setSessionCookie(createSessionToken(user.id));
  return NextResponse.json({ user: publicUser(user) });
}
