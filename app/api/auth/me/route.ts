import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/auth/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: publicUser(user) });
}
