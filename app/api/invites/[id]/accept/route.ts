import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/server";
import { getInvite, acceptInvite } from "@/invites/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The whole point of verification. An invite is addressed to an email, so
  // accepting one is claiming to be that address's owner. Anyone can type any
  // address at signup, and without this check registering a colleague's address
  // first is enough to receive their invitations.
  if (user.emailVerifiedAt === null) {
    return NextResponse.json(
      { error: "Verify your email address before joining a board." },
      { status: 403 },
    );
  }

  const invite = getInvite(id);
  if (!invite || invite.inviteeEmail !== user.email.toLowerCase() || invite.status !== "pending") {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }
  acceptInvite(id, user.id);
  return NextResponse.json({ ok: true, boardId: invite.boardId });
}
