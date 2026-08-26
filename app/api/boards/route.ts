import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { rateLimit } from "@/auth/rate-limit";
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

  // Keyed by account, not IP: this needs a session anyway, and one busy person
  // behind an office NAT should not throttle their colleagues.
  if (!rateLimit(`boards:create:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Slow down a moment and try again." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const name = parsed.success ? (parsed.data.name ?? "") : "";
  const board = createBoard(user.id, name);
  return NextResponse.json({ board });
}
