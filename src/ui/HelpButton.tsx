/**
 * Bottom-left help button: a round "?" that opens a compact keyboard-shortcut
 * cheatsheet (BrainScape convention).
 */
"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

const SHORTCUTS: [string, string][] = [
  ["Select / Hand", "V / H"],
  ["Text / Sticky", "T / S"],
  ["Pen / Comment", "P / C"],
  ["Undo / Redo", "⌘Z / ⌘⇧Z"],
  ["Copy / Paste", "⌘C / ⌘V"],
  ["Duplicate", "⌘D"],
  ["Bring forward / back", "⌘] / ⌘["],
  ["Zoom to fit / 100%", "⇧1 / ⇧2"],
  ["Export PNG", "⌘⇧E"],
  ["Connect (with selection)", "⌥ + arrow"],
];

export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="animate-pop-up absolute bottom-full left-0 z-20 mb-2 w-72 rounded-2xl border border-hairline bg-chrome p-3 shadow-toolbar">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Shortcuts</p>
            <ul className="flex flex-col">
              {SHORTCUTS.map(([label, keys]) => (
                <li key={label} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm">
                  <span className="text-ink">{label}</span>
                  <kbd className="rounded-md border border-hairline bg-muted px-1.5 py-0.5 text-xs font-medium text-ink-soft">{keys}</kbd>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
      <button
        type="button"
        aria-label="Help and shortcuts"
        title="Help and shortcuts"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto grid size-11 place-items-center rounded-full border border-hairline bg-chrome text-ink-soft shadow-toolbar transition-transform duration-100 hover:text-ink active:scale-90 [&_svg]:size-[20px]"
      >
        <HelpCircle />
      </button>
    </div>
  );
}
