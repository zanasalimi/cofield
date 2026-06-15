import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { createBoard, listBoardsForUser } from "@/boards/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ boards: listBoardsForUser(user.id) });
}

const Body = z.object({ name: z.string().max(80).optional() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const name = parsed.success ? (parsed.data.name ?? "") : "";
  const board = createBoard(user.id, name);
  return NextResponse.json({ board });
}
