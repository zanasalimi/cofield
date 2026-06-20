import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { getMemberRole } from "@/boards/server";
import { createInvite } from "@/invites/server";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Owner-only: otherwise a viewer/editor could invite an address they control
  // and accept it as `editor`, escalating their own access.
  if (getMemberRole(boardId, user.id) !== "owner") {
    return NextResponse.json({ error: "Only the board owner can invite people." }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const invite = createInvite(boardId, user.id, parsed.data.email);
  return NextResponse.json({ invite: { id: invite.id, inviteeEmail: invite.inviteeEmail, status: invite.status } });
}
