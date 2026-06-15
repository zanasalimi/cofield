import { NextResponse } from "next/server";
import { getSessionToken, deleteSessionToken, clearSessionCookie } from "@/auth/server";

export async function POST() {
  const token = await getSessionToken();
  if (token) deleteSessionToken(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
