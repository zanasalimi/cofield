/**
 * The full-width app header (BrainScape layout): brand mark + wordmark, a
 * breadcrumb to the editable board name, then the room's status: transport
 * health, the board menu, the live avatar stack, and Share.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "@embertoast/react";
import { Settings, Download, Maximize, Home, Undo2, Redo2 } from "@/components/icons";
import { useBoardStore } from "@/store/board-store";
import { AvatarStack } from "@/presence/AvatarStack";
import { ConnectionStatus } from "@/ui/ConnectionStatus";
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

export function TopBar({ boardId, canShare, initialName }: { boardId: string; canShare: boolean; initialName: string }) {
  const meta = useBoardStore((s) => s.meta);
  // The name lives in two places on purpose: the Yjs document so a rename is
  // live for everyone in the room, and SQLite because the dashboard, invites and
  // share panel all read it server-side. The document wins once it has a value;
  // until then the row created at `POST /api/boards` is what to show, which is
  // why a freshly named board used to open as "Untitled".
  const docName = meta.name as string | undefined;
  const name = docName ?? initialName;
  const [menu, setMenu] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const rename = (next: string) => {
    useBoardStore.getState().setMeta({ name: next });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/boards/${boardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: next }),
          });
          // The room already shows the new name; only the dashboard would go
          // stale, so say so rather than letting it drift unannounced.
          if (!res.ok) toast.error("Renamed here, but couldn't save it to your boards list.");
        } catch {
          toast.error("Renamed here, but couldn't reach the server to save it.");
        }
      })();
    }, 700);
  };

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-hairline bg-chrome px-3 sm:px-5">
      {/* Wordmark + breadcrumb. The wordmark costs 69px of a 360px header and
          the board name is what you actually need there, so on phones it gives
          way; "All boards" in the board menu is still the way back. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
        <Link href="/boards" className="hidden shrink-0 select-none text-lg font-bold leading-9 tracking-tight text-ink sm:block">
          Cofield
        </Link>
        <span className="hidden shrink-0 select-none text-lg font-light leading-9 text-ink-soft/40 sm:block">/</span>
        <input
          value={name}
          onChange={(e) => rename(e.target.value)}
          placeholder="Untitled board"
          aria-label="Board name"
          className="h-9 w-full min-w-0 max-w-[42ch] flex-1 truncate rounded-lg bg-transparent px-2 py-0 text-base font-medium leading-9 text-ink outline-none transition-colors placeholder:text-ink-soft hover:bg-ink/5 focus:bg-ink/5"
        />
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ConnectionStatus />
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
