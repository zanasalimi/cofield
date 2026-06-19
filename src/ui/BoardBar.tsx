/**
 * Top-left board bar (Miro convention): the Cofield wordmark, the editable board
 * name (synced through the doc meta), and a board menu with export / fit / home.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Maximize, Home, Undo2, Redo2 } from "lucide-react";
import { useBoardStore } from "@/store/board-store";

function fire(name: string) {
  window.dispatchEvent(new Event(name));
}

export function BoardBar() {
  const meta = useBoardStore((s) => s.meta);
  const name = (meta.name as string | undefined) ?? "";
  const [menu, setMenu] = useState(false);

  return (
    <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl border border-hairline bg-chrome px-2 py-1.5 shadow-toolbar">
      <span className="select-none px-1 text-sm font-semibold tracking-tight text-ink">Cofield</span>
      <div className="h-5 w-px bg-hairline" />
      <input
        value={name}
        onChange={(e) => useBoardStore.getState().setMeta({ name: e.target.value })}
        placeholder="Untitled"
        aria-label="Board name"
        className="w-40 rounded-md bg-transparent px-1.5 py-0.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft hover:bg-ink/5 focus:bg-ink/5"
      />
      <button
        type="button"
        aria-label="Board menu"
        onClick={() => setMenu((m) => !m)}
        className="grid size-7 place-items-center rounded-lg text-ink-soft transition-transform duration-100 hover:bg-ink/5 hover:text-ink active:scale-90"
      >
        <ChevronDown className="size-4" />
      </button>

      {menu ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div className="animate-pop absolute left-2 top-full z-30 mt-2 w-48 rounded-xl border border-hairline bg-chrome p-1 shadow-toolbar">
            <MenuItem icon={<Undo2 className="size-4" />} label="Undo" shortcut="⌘Z" onClick={() => (useBoardStore.getState().undo(), setMenu(false))} />
            <MenuItem icon={<Redo2 className="size-4" />} label="Redo" shortcut="⌘⇧Z" onClick={() => (useBoardStore.getState().redo(), setMenu(false))} />
            <div className="my-1 h-px bg-hairline" />
            <MenuItem icon={<Maximize className="size-4" />} label="Zoom to fit" shortcut="⇧1" onClick={() => (fire("cofield:zoomfit"), setMenu(false))} />
            <MenuItem icon={<Download className="size-4" />} label="Export PNG" shortcut="⌘⇧E" onClick={() => (fire("cofield:export"), setMenu(false))} />
            <div className="my-1 h-px bg-hairline" />
            <Link href="/boards" className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-ink transition-colors hover:bg-ink/5">
              <Home className="size-4 text-ink-soft" />
              <span>All boards</span>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuItem({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
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
