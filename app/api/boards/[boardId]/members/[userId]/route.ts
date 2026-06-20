import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { getMemberRole, setMemberRole, removeMember } from "@/boards/server";

const RoleBody = z.object({ role: z.enum(["editor", "viewer"]) });

/** Change a member's role. Owner only; the owner's role can't be changed. */
export async function PATCH(req: Request, { params }: { params: Promise<{ boardId: string; userId: string }> }) {
  const { boardId, userId } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (getMemberRole(boardId, me.id) !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  if (getMemberRole(boardId, userId) === "owner") return NextResponse.json({ error: "can't change the owner" }, { status: 400 });

  const parsed = RoleBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid role" }, { status: 400 });

  setMemberRole(boardId, userId, parsed.data.role);
  return NextResponse.json({ ok: true });
}

/** Remove a member. The owner can remove anyone but themselves; a member can
 *  remove only themselves (leave the board). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ boardId: string; userId: string }> }) {
  const { boardId, userId } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isOwner = getMemberRole(boardId, me.id) === "owner";
  if (!isOwner && me.id !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (getMemberRole(boardId, userId) === "owner") return NextResponse.json({ error: "the owner can't be removed" }, { status: 400 });

  removeMember(boardId, userId);
  return NextResponse.json({ ok: true });
}
