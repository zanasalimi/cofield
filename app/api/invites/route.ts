import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/server";
import { listIncomingInvites } from "@/invites/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ invites: listIncomingInvites(user.email) });
}
