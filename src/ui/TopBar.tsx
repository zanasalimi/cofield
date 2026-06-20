/**
 * The full-width app header (BrainScape layout): brand mark + wordmark, a
 * breadcrumb to the editable board name, then the room's quick actions —
 * apps / search / settings (board menu) — the live avatar stack, and Share.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, Download, Maximize, Home, Undo2, Redo2 } from "@/components/icons";
import { useBoardStore } from "@/store/board-store";
import { AvatarStack } from "@/presence/AvatarStack";
import { ShareButton } from "@/components/boards/ShareButton";

function fire(name: string) {
  window.dispatchEvent(new Event(name));
}

function HeaderButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors duration-100 hover:bg-ink/5 hover:text-ink active:scale-90 [&_svg]:size-[20px]"
    >
      {children}
    </button>
  );
}

export function TopBar({ boardId, canShare }: { boardId: string; canShare: boolean }) {
  const meta = useBoardStore((s) => s.meta);
  const name = (meta.name as string | undefined) ?? "";
  const [menu, setMenu] = useState(false);

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-hairline bg-chrome px-3 sm:px-5">
      {/* Wordmark + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <Link href="/boards" className="shrink-0 select-none text-lg font-bold leading-9 tracking-tight text-ink">
          Cofield
        </Link>
        <span className="shrink-0 select-none text-lg font-light leading-9 text-ink-soft/40">/</span>
        <input
          value={name}
          onChange={(e) => useBoardStore.getState().setMeta({ name: e.target.value })}
          placeholder="Untitled board"
          aria-label="Board name"
          className="h-9 min-w-0 max-w-[42ch] flex-1 truncate rounded-lg bg-transparent px-2 py-0 text-base font-medium leading-9 text-ink outline-none transition-colors placeholder:text-ink-soft hover:bg-ink/5 focus:bg-ink/5"
          size={Math.max(10, name.length + 2)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <HeaderButton label="Board menu" onClick={() => setMenu((m) => !m)}>
            <Settings />
          </HeaderButton>
          {menu ? (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <div className="animate-pop absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-hairline bg-chrome p-1.5 shadow-toolbar">
                <MenuItem icon={<Undo2 className="size-4" />} label="Undo" shortcut="⌘Z" onClick={() => (useBoardStore.getState().undo(), setMenu(false))} />
                <MenuItem icon={<Redo2 className="size-4" />} label="Redo" shortcut="⌘⇧Z" onClick={() => (useBoardStore.getState().redo(), setMenu(false))} />
                <div className="my-1 h-px bg-hairline" />
                <MenuItem icon={<Maximize className="size-4" />} label="Zoom to fit" shortcut="⇧1" onClick={() => (fire("cofield:zoomfit"), setMenu(false))} />
                <MenuItem icon={<Download className="size-4" />} label="Export PNG" shortcut="⌘⇧E" onClick={() => (fire("cofield:export"), setMenu(false))} />
                <div className="my-1 h-px bg-hairline" />
                <Link href="/boards" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-ink/5">
                  <Home className="size-4 text-ink-soft" />
                  <span>All boards</span>
                </Link>
              </div>
            </>
          ) : null}
        </div>

        <div className="mx-1 h-7 w-px bg-hairline" />
        <AvatarStack />
        <ShareButton boardId={boardId} canShare={canShare} />
      </div>
    </header>
  );
}

function MenuItem({ icon, label, shortcut, onClick }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5 active:scale-[0.98]"
    >
      <span className="text-ink-soft">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut ? <span className="text-xs text-ink-soft">{shortcut}</span> : null}
    </button>
  );
}
