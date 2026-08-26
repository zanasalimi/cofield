/**
 * The board view: a full-width header over the canvas surface. The toolbar,
 * help, minimap and zoom chrome float over the canvas (BrainScape layout).
 */
import { redirect } from "next/navigation";
import { Canvas } from "@/canvas/Canvas";
import { ThumbnailCapture } from "@/canvas/ThumbnailCapture";
import { TopBar } from "@/ui/TopBar";
import { Toolbar } from "@/ui/Toolbar";
import { PenToolbar } from "@/ui/PenToolbar";
import { Minimap } from "@/ui/Minimap";
import { HelpButton } from "@/ui/HelpButton";
import { ZoomControl } from "@/ui/ZoomControl";
import { Inspector } from "@/canvas/Inspector";
import { TemplateGallery } from "@/templates/TemplateGallery";
import { getCurrentUser } from "@/auth/server";
import { DEMO_BOARD_ID, getBoard, isMember, joinDemoBoard } from "@/boards/server";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  // Every board needs a session. The demo is shared rather than public: a
  // signed-in visitor is joined to it here, before the client opens its socket,
  // so the relay authorises that connection off a real membership row.
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (boardId === DEMO_BOARD_ID) joinDemoBoard(user.id);
  else if (!isMember(boardId, user.id)) redirect("/boards");

  // Pass only safe identity fields to the client (no password hash).
  const me = { id: user.id, name: user.name, color: user.color };
  const board = getBoard(boardId);

  return (
    <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-[#EDEDF0]">
      <TopBar boardId={boardId} canShare={boardId !== DEMO_BOARD_ID} initialName={board?.name ?? ""} />

      <div className="relative flex-1 overflow-hidden">
        <Canvas boardId={boardId} user={me} />
        <ThumbnailCapture boardId={boardId} />

        {/* One bottom rail rather than three independently-positioned corners.
            A centred absolute stack collides with the corners once the pen
            toolbar widens it, and no breakpoint fixes that for every
            combination, so the three share a flex row instead: the centre takes
            the slack and the corners can never be overlapped. The corners
            themselves are pointer conveniences and stay hidden until lg, where
            touch gets pinch and drag instead. */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end gap-3 sm:inset-x-5 sm:bottom-5">
          {/* Equal basis on both corners keeps the rail on the true centre line
              even though the minimap side is wider; `mx-auto` centres it again
              below lg, where the corners are display:none and contribute
              nothing. Only the centre gets min-w-0, so it is the one that
              wraps when space runs short rather than the corners collapsing. */}
          <div className="hidden flex-1 basis-0 items-center gap-2 lg:flex">
            <TemplateGallery />
            <HelpButton />
          </div>

          <div className="mx-auto flex min-w-0 flex-col items-center gap-2">
            <PenToolbar />
            <div className="pointer-events-auto lg:hidden">
              <TemplateGallery />
            </div>
            <Toolbar />
          </div>

          <div className="hidden flex-1 basis-0 flex-col items-end gap-2.5 lg:flex">
            <Minimap />
            <ZoomControl />
          </div>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 sm:right-5 sm:top-5">
          <Inspector />
        </div>
      </div>
    </div>
  );
}
