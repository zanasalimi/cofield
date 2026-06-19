/**
 * The pen sub-toolbar — appears above the main rail while the pen tool is active.
 * Switches brush mode (pen / highlighter / eraser) and, for the drawing modes,
 * sets stroke size and colour.
 */
"use client";

import { Pen, Highlighter, Eraser } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { Slider } from "@/components/ui/slider";

const PEN_COLORS = ["#1A1A1A", "#4262FF", "#E03E3E", "#0F9D58", "#F59E0B", "#9333EA", "#FF9F1C", "#2D9CDB"];
const MODES = [
  { mode: "pen", Icon: Pen, label: "Pen" },
  { mode: "highlighter", Icon: Highlighter, label: "Highlighter" },
  { mode: "eraser", Icon: Eraser, label: "Eraser" },
] as const;

export function PenToolbar() {
  const activeTool = useUiStore((s) => s.activeTool);
  const penMode = useUiStore((s) => s.penMode);
  const penColor = useUiStore((s) => s.penColor);
  const penSize = useUiStore((s) => s.penSize);
  if (activeTool !== "draw") return null;
  const ui = useUiStore.getState();

  return (
    <div className="animate-pop-up pointer-events-auto flex items-center gap-1 rounded-2xl border border-hairline bg-chrome p-2 shadow-toolbar">
      {MODES.map(({ mode, Icon, label }) => (
        <button
          key={mode}
          type="button"
          title={label}
          onClick={() => ui.setPenMode(mode)}
          className={`grid size-11 place-items-center rounded-xl transition-transform duration-100 active:scale-90 ${
            penMode === mode ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <Icon className="size-[20px]" />
        </button>
      ))}

      {penMode !== "eraser" ? (
        <>
          <div className="mx-1 h-7 w-px bg-hairline" />
          <div className="flex items-center gap-2.5 px-1">
            <Slider min={1} max={20} value={[penSize]} onValueChange={([v]) => ui.setPenSize(v ?? penSize)} className="w-24" />
            <span className="w-5 text-center text-xs tabular-nums text-ink-soft">{penSize}</span>
          </div>
          <div className="mx-1 h-7 w-px bg-hairline" />
          <div className="flex items-center gap-1">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Pen colour ${c}`}
                onClick={() => ui.setPenColor(c)}
                className={`size-6 rounded-full transition-transform hover:scale-110 active:scale-95 ${penColor === c ? "ring-2 ring-ink/40 ring-offset-1" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
