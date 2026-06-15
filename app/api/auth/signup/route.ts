import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail, createSessionToken, setSessionCookie, publicUser } from "@/auth/server";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
  const user = createUser(email, password, name);
  await setSessionCookie(createSessionToken(user.id));
  return NextResponse.json({ user: publicUser(user) });
}
