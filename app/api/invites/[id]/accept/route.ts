import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/server";
import { getInvite, acceptInvite } from "@/invites/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const invite = getInvite(id);
  if (!invite || invite.inviteeEmail !== user.email.toLowerCase() || invite.status !== "pending") {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }
  acceptInvite(id, user.id);
  return NextResponse.json({ ok: true, boardId: invite.boardId });
}
