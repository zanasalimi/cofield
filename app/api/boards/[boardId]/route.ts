import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { getMemberRole, renameBoard } from "@/boards/server";

const Body = z.object({ name: z.string().max(80) });

/** Rename a board. The canvas header edits the Yjs document so the change is
 *  live for everyone in the room, then lands here so the dashboard, invites and
 *  share panel agree with it. Viewers cannot rename. */
export async function PATCH(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const role = getMemberRole(boardId, user.id);
  if (!role || role === "viewer") {
    return NextResponse.json({ error: "You can't rename this board." }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  renameBoard(boardId, parsed.data.name.trim() || "Untitled board");
  return NextResponse.json({ ok: true });
}
