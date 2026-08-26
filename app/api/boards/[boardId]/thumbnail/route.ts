import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/auth/server";
import { rateLimit } from "@/auth/rate-limit";
import { isMember, setBoardThumbnail } from "@/boards/server";

/**
 * A data URL supplied by a client and later rendered in an `<img>` on everyone's
 * dashboard, so the shape is pinned rather than trusted: base64 WebP or PNG and
 * nothing else. Without the format check a `data:text/html` payload would be one
 * `<img>` away from being something else entirely.
 */
const DATA_URL = /^data:image\/(webp|png);base64,[A-Za-z0-9+/]+={0,2}$/;

/** ~150KB of base64, comfortably above a real thumbnail and far below anything
 *  worth storing in a row that every dashboard query reads. */
const MAX_CHARS = 150_000;

// null clears it: a board emptied of every shape has no picture to show, and
// the card falls back to its placeholder.
const Body = z.object({
  thumbnail: z.string().max(MAX_CHARS).regex(DATA_URL, "Unsupported image format").nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Keyed by account, not IP: these need a session anyway, and one busy person
  // behind an office NAT should not throttle their colleagues.
  if (!rateLimit(`thumbnail:put:${user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "Slow down a moment and try again." }, { status: 429 });
  }

  // Any member may refresh it: having the board open is what produces the
  // picture, and a viewer sees the same pixels an editor does.
  if (!isMember(boardId, user.id)) {
    return NextResponse.json({ error: "not a board member" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid image" }, { status: 400 });
  }

  setBoardThumbnail(boardId, parsed.data.thumbnail);
  return NextResponse.json({ ok: true });
}
