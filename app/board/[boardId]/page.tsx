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
import { TemplateGallery } from "@/templates/TemplateGallery";
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

  const user = await getCurrentUser();
  if (boardId !== DEMO_BOARD) {
    if (!user) redirect("/signin");
    if (!isMember(boardId, user.id)) redirect("/boards");
  }
  // Pass only safe identity fields to the client (no password hash).
  const me = user ? { id: user.id, name: user.name, color: user.color } : null;

  return (
    <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-[#EDEDF0]">
      <TopBar boardId={boardId} canShare={boardId !== DEMO_BOARD} />

      <div className="relative flex-1 overflow-hidden">
        <Canvas boardId={boardId} user={me} />

        {/* Floating chrome over the canvas. On phones the corners are too tight
            for a centred full-width toolbar, so Templates stacks above it here
            and only moves to the bottom-left corner from sm up. */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-5">
          <PenToolbar />
          <div className="pointer-events-auto sm:hidden">
            <TemplateGallery />
          </div>
          <Toolbar />
        </div>
        <div className="pointer-events-none absolute bottom-5 left-5 hidden items-center gap-2 sm:flex">
          <TemplateGallery />
          <HelpButton />
        </div>
        {/* Minimap + zoom are desktop conveniences — mobile uses touch pinch/scroll. */}
        <div className="pointer-events-none absolute bottom-5 right-5 hidden flex-col items-end gap-2.5 sm:flex">
          <Minimap />
          <ZoomControl />
        </div>
        <div className="pointer-events-none absolute right-3 top-3 sm:right-5 sm:top-5">
          <Inspector />
        </div>
      </div>
    </div>
  );
}
