import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/server";
import { isMember, listMembers } from "@/boards/server";
import { listBoardInvites } from "@/invites/server";

/** The real member list + pending invites for a board (members only). */
export async function GET(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isMember(boardId, user.id)) return NextResponse.json({ error: "not a board member" }, { status: 403 });

  return NextResponse.json({ members: listMembers(boardId), invites: listBoardInvites(boardId) });
}
