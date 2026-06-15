/**
 * The board view — the canvas itself. A board is a room joined by URL.
 * The floating toolbar and presence layers mount over the canvas surface.
 */
import { Canvas } from "@/canvas/Canvas";
import { Toolbar } from "@/ui/Toolbar";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-paper">
      <Canvas boardId={boardId} />

      {/* Floating chrome over the canvas — not a dashboard frame. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <Toolbar />
      </div>

      {/* TODO(M4): AvatarStack top-right, connection indicator, share dialog. */}
    </div>
  );
}
