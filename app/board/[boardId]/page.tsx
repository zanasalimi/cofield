/**
 * The board view — the canvas itself. A board is a room joined by URL.
 * The floating toolbar and presence layers mount over the canvas surface.
 */
import { redirect } from "next/navigation";
import { Canvas } from "@/canvas/Canvas";
import { Toolbar } from "@/ui/Toolbar";
import { ShareButton } from "@/components/boards/ShareButton";
import { getCurrentUser } from "@/auth/server";
import { isMember } from "@/boards/server";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

// "demo" is a public playground; every real board is membership-gated (the
// websocket join is gated the same way, so this guard can't be bypassed).
const DEMO_BOARD = "demo";

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  if (boardId !== DEMO_BOARD) {
    const user = await getCurrentUser();
    if (!user) redirect("/signin");
    if (!isMember(boardId, user.id)) redirect("/boards");
  }

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-paper">
      <Canvas boardId={boardId} />

      {/* Floating chrome over the canvas — not a dashboard frame. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <Toolbar />
      </div>

      {boardId !== DEMO_BOARD && (
        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2">
          <ShareButton boardId={boardId} />
        </div>
      )}
    </div>
  );
}
