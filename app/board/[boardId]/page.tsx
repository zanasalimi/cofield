/**
 * The board view — a full-width header over the canvas surface. The toolbar,
 * help, minimap and zoom chrome float over the canvas (BrainScape layout).
 */
import { redirect } from "next/navigation";
import { Canvas } from "@/canvas/Canvas";
import { TopBar } from "@/ui/TopBar";
import { Toolbar } from "@/ui/Toolbar";
import { PenToolbar } from "@/ui/PenToolbar";
import { Minimap } from "@/ui/Minimap";
import { HelpButton } from "@/ui/HelpButton";
import { ZoomControl } from "@/ui/ZoomControl";
import { Inspector } from "@/canvas/Inspector";
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
    <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-[#EDEDF0]">
      <TopBar boardId={boardId} canShare={boardId !== DEMO_BOARD} />

      <div className="relative flex-1 overflow-hidden">
        <Canvas boardId={boardId} />

        {/* Floating chrome over the canvas. */}
        <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <PenToolbar />
          <Toolbar />
        </div>
        <div className="pointer-events-none absolute bottom-5 left-5">
          <HelpButton />
        </div>
        <div className="pointer-events-none absolute bottom-5 right-5 flex flex-col items-end gap-2.5">
          <Minimap />
          <ZoomControl />
        </div>
        <div className="pointer-events-none absolute right-5 top-5">
          <Inspector />
        </div>
      </div>
    </div>
  );
}
