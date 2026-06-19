/**
 * Right-click context menu for the selected shapes: z-order, duplicate, lock,
 * delete. Positioned in screen space at the cursor; closes on action or click
 * away. Styled with the preset's chrome tokens to match the rest of the UI.
 */
"use client";

import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, Copy, Lock, Unlock, Trash2 } from "@/components/icons";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";

function Item({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-ink/5 active:scale-[0.98]"
    >
      <span className="text-ink-soft">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut ? <span className="text-xs text-ink-soft">{shortcut}</span> : null}
    </button>
  );
}

export function ContextMenu() {
  const menu = useUiStore((s) => s.contextMenu);
  const selection = useUiStore((s) => s.selection);
  const shapes = useBoardStore((s) => s.shapes);

  if (!menu || selection.length === 0) return null;

  const board = useBoardStore.getState();
  const ui = useUiStore.getState();
  const close = () => ui.setContextMenu(null);
  const sel = new Set(selection);
  const allLocked = shapes.filter((s) => sel.has(s.id)).every((s) => s.locked);

  const act = (fn: () => void) => () => {
    fn();
    close();
  };

  return (
    <>
      {/* click-away catcher */}
      <div className="fixed inset-0 z-20" onPointerDown={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div
        className="absolute z-30 w-52 rounded-xl border border-hairline bg-chrome p-1 shadow-toolbar"
        style={{ left: menu.x, top: menu.y }}
      >
        <Item icon={<ArrowUp className="size-4" />} label="Bring to front" shortcut="⌘]" onClick={act(() => board.reorder(selection, "front"))} />
        <Item icon={<ChevronUp className="size-4" />} label="Bring forward" onClick={act(() => board.reorder(selection, "forward"))} />
        <Item icon={<ChevronDown className="size-4" />} label="Send backward" onClick={act(() => board.reorder(selection, "backward"))} />
        <Item icon={<ArrowDown className="size-4" />} label="Send to back" shortcut="⌘[" onClick={act(() => board.reorder(selection, "back"))} />
        <div className="my-1 h-px bg-hairline" />
        <Item
          icon={<Copy className="size-4" />}
          label="Duplicate"
          shortcut="⌘D"
          onClick={act(() => ui.setSelection(board.duplicate(selection)))}
        />
        <Item
          icon={allLocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
          label={allLocked ? "Unlock" : "Lock"}
          onClick={act(() => board.setLocked(selection, !allLocked))}
        />
        <div className="my-1 h-px bg-hairline" />
        <Item
          icon={<Trash2 className="size-4" />}
          label="Delete"
          shortcut="Del"
          onClick={act(() => {
            for (const id of selection) board.removeShape(id);
            ui.setSelection([]);
          })}
        />
      </div>
    </>
  );
}
