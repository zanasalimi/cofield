/**
 * Bottom-right control cluster (under the minimap): undo / redo, a zoom stepper
 * with a reset-to-100% readout, and a comment toggle. Matches the BrainScape row.
 */
"use client";

import { Undo2, Redo2, Minus, Plus, MessageSquare } from "@/components/icons";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { zoomAt } from "@/canvas/viewport/viewport";

function ClusterButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-xl transition-transform duration-100 active:scale-90 [&_svg]:size-[18px] ${
        active ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function ZoomControl() {
  const zoom = useUiStore((s) => s.viewport.zoom);
  const commentMode = useUiStore((s) => s.commentMode);

  const stepZoom = (factor: number) => {
    const vp = useUiStore.getState().viewport;
    const anchor = { x: window.innerWidth / 2, y: (window.innerHeight - 64) / 2 };
    useUiStore.getState().setViewport(zoomAt(vp, anchor, factor));
  };

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-hairline bg-chrome p-1.5 shadow-toolbar">
      <ClusterButton label="Undo" onClick={() => useBoardStore.getState().undo()}>
        <Undo2 />
      </ClusterButton>
      <ClusterButton label="Redo" onClick={() => useBoardStore.getState().redo()}>
        <Redo2 />
      </ClusterButton>
      <div className="mx-0.5 h-6 w-px bg-hairline" />
      <ClusterButton label="Zoom out" onClick={() => stepZoom(1 / 1.2)}>
        <Minus />
      </ClusterButton>
      <button
        type="button"
        onClick={() => useUiStore.getState().setViewport({ ...useUiStore.getState().viewport, zoom: 1 })}
        className="min-w-[3.5rem] rounded-xl px-2 py-1.5 text-center text-sm font-medium tabular-nums text-ink transition-colors hover:bg-ink/5 active:scale-95"
        aria-label="Reset zoom to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ClusterButton label="Zoom in" onClick={() => stepZoom(1.2)}>
        <Plus />
      </ClusterButton>
      <div className="mx-0.5 h-6 w-px bg-hairline" />
      <ClusterButton label="Comment" active={commentMode} onClick={() => useUiStore.getState().setCommentMode(!commentMode)}>
        <MessageSquare />
      </ClusterButton>
    </div>
  );
}
