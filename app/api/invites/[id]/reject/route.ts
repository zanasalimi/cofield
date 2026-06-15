import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/server";
import { getInvite, rejectInvite } from "@/invites/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const invite = getInvite(id);
  if (!invite || invite.inviteeEmail !== user.email.toLowerCase() || invite.status !== "pending") {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }
  rejectInvite(id);
  return NextResponse.json({ ok: true });
}
