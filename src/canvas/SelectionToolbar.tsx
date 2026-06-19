/**
 * The per-item context toolbar (Miro convention) above a single selected shape.
 * Adapts to the shape: fill, font family/size/bold/align/colour for anything that
 * carries text, line colour + width for connectors, plus opacity, link, lock and
 * delete. Colour, font, opacity and link open small themed popovers.
 */
"use client";

import { useState } from "react";
import {
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Lock,
  Unlock,
  Trash2,
  Minus,
  Plus,
  Droplets,
  ChevronDown,
} from "lucide-react";
import type { Shape, ShapeStyle } from "@/collab/types";
import { FONT_NAMES, fontStack } from "./fonts";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

const FILL_COLORS = [
  "#FFFFFF", "#FFE8A3", "#FF9F1C", "#FFC2D1", "#F8B4B4",
  "#BBE5B3", "#A7E8E0", "#BFE3FF", "#D9C2FF", "#E7E5E0",
  "#1A1A1A", "#6B6B66", "#E03E3E", "#0F9D58", "#4262FF",
];
const TEXT_COLORS = ["#1A1A1A", "#FFFFFF", "#6B6B66", "#E03E3E", "#F59E0B", "#0F9D58", "#2D9CDB", "#5B5BD6", "#C44CD9"];
const LINE_COLORS = ["#37352F", "#1A1A1A", "#4262FF", "#E03E3E", "#0F9D58", "#F59E0B", "#9333EA", "#6B6B66"];
const WIDTHS = [2, 3.5, 5];
const LABELLED = new Set(["rect", "ellipse", "triangle", "diamond", "star", "sticky", "text"]);

function btn(active = false): string {
  return `grid h-7 min-w-7 place-items-center rounded-lg px-1 text-sm transition-transform duration-100 active:scale-90 ${
    active ? "bg-ink/10 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
  }`;
}

function Pop({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-pop absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-xl border border-hairline bg-chrome p-2 shadow-toolbar">
      {children}
    </div>
  );
}

function ColorGrid({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="size-6 rounded-md border border-black/10 transition-transform hover:scale-110 active:scale-95"
          style={{ background: c }}
          aria-label={`Colour ${c}`}
        />
      ))}
    </div>
  );
}

export function SelectionToolbar() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);
  const [open, setOpen] = useState<string | null>(null);

  if (selection.length !== 1 || editingId) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape) return null;

  const st = shape.style;
  const set = (patch: Partial<ShapeStyle>) => useBoardStore.getState().updateShape(shape.id, { style: { ...st, ...patch } });
  const setShape = (patch: Partial<Shape>) => useBoardStore.getState().updateShape(shape.id, patch);
  const toggle = (key: string) => setOpen((o) => (o === key ? null : key));

  const isConnector = shape.type === "connector";
  const isImage = shape.type === "image";
  const hasFill = !isConnector && !isImage && shape.type !== "text";
  const hasText = LABELLED.has(shape.type);
  const fs = st.fontSize ?? (shape.type === "text" ? 16 : 14);

  // Anchor above the shape; for a connector use the midpoint of its two ends.
  let world = { x: shape.x + shape.w / 2, y: shape.y };
  if (isConnector) {
    const a = shapes.find((s) => s.id === shape.from);
    const b = shapes.find((s) => s.id === shape.to);
    if (a && b) world = { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: Math.min(a.y, b.y) };
  }
  const anchor = worldToScreen(viewport, world);

  const Sep = () => <div className="mx-0.5 h-5 w-px bg-hairline" />;

  return (
    <div
      className="animate-pop pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-hairline bg-chrome px-1.5 py-1 shadow-toolbar"
      style={{ left: anchor.x, top: Math.max(8, anchor.y - 52) }}
    >
      {/* Fill */}
      {hasFill ? (
        <div className="relative">
          <button type="button" title="Fill colour" onClick={() => toggle("fill")} className={btn(open === "fill")}>
            <span className="size-4 rounded-[5px] border border-black/15" style={{ background: st.fill }} />
          </button>
          {open === "fill" ? (
            <Pop>
              <ColorGrid colors={FILL_COLORS} onPick={(c) => (set({ fill: c }), setOpen(null))} />
            </Pop>
          ) : null}
        </div>
      ) : null}

      {/* Connector line colour + width */}
      {isConnector ? (
        <>
          <div className="relative">
            <button type="button" title="Line colour" onClick={() => toggle("line")} className={btn(open === "line")}>
              <span className="size-4 rounded-full border border-black/15" style={{ background: st.stroke }} />
            </button>
            {open === "line" ? (
              <Pop>
                <ColorGrid colors={LINE_COLORS} onPick={(c) => (set({ stroke: c }), setOpen(null))} />
              </Pop>
            ) : null}
          </div>
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              type="button"
              title={`Line ${["thin", "medium", "thick"][i]}`}
              onClick={() => set({ strokeWidth: w })}
              className={btn(Math.abs((st.strokeWidth ?? 2) - w) < 0.6)}
            >
              <span className="rounded-full bg-current" style={{ width: 14, height: 1 + i * 1.5 }} />
            </button>
          ))}
        </>
      ) : null}

      {/* Typography */}
      {hasText ? (
        <>
          {hasFill ? <Sep /> : null}
          <div className="relative">
            <button type="button" title="Font" onClick={() => toggle("font")} className={btn(open === "font")}>
              <span className="px-0.5 text-[13px]" style={{ fontFamily: fontStack(st.fontFamily) }}>
                {st.fontFamily ?? "Sans"}
              </span>
              <ChevronDown className="size-3" />
            </button>
            {open === "font" ? (
              <Pop>
                <div className="flex w-32 flex-col">
                  {FONT_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => (set({ fontFamily: name }), setOpen(null))}
                      className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink/5"
                      style={{ fontFamily: fontStack(name) }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </Pop>
            ) : null}
          </div>
          <button type="button" title="Smaller" onClick={() => set({ fontSize: Math.max(8, fs - 2) })} className={btn()}>
            <Minus className="size-3.5" />
          </button>
          <span className="w-6 text-center text-xs tabular-nums text-ink-soft">{fs}</span>
          <button type="button" title="Larger" onClick={() => set({ fontSize: Math.min(96, fs + 2) })} className={btn()}>
            <Plus className="size-3.5" />
          </button>
          <button type="button" title="Bold" onClick={() => set({ bold: !st.bold })} className={btn(st.bold)}>
            <Bold className="size-4" />
          </button>
          <button
            type="button"
            title="Align"
            onClick={() => {
              const order = ["left", "center", "right"] as const;
              set({ align: order[(order.indexOf(st.align ?? "left") + 1) % order.length] });
            }}
            className={btn()}
          >
            {st.align === "center" ? <AlignCenter className="size-4" /> : st.align === "right" ? <AlignRight className="size-4" /> : <AlignLeft className="size-4" />}
          </button>
          <div className="relative">
            <button type="button" title="Text colour" onClick={() => toggle("text")} className={btn(open === "text")}>
              <span className="font-semibold leading-none" style={{ color: st.textColor ?? "#1A1A1A" }}>A</span>
            </button>
            {open === "text" ? (
              <Pop>
                <ColorGrid colors={TEXT_COLORS} onPick={(c) => (set({ textColor: c }), setOpen(null))} />
              </Pop>
            ) : null}
          </div>
        </>
      ) : null}

      <Sep />

      {/* Opacity */}
      <div className="relative">
        <button type="button" title="Opacity" onClick={() => toggle("opacity")} className={btn(open === "opacity")}>
          <Droplets className="size-4" />
        </button>
        {open === "opacity" ? (
          <Pop>
            <div className="flex w-40 items-center gap-2 px-1">
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round((st.opacity ?? 1) * 100)}
                onChange={(e) => set({ opacity: Number(e.target.value) / 100 })}
                className="h-1 flex-1 accent-[#4262FF]"
              />
              <span className="w-9 text-right text-xs tabular-nums text-ink-soft">{Math.round((st.opacity ?? 1) * 100)}%</span>
            </div>
          </Pop>
        ) : null}
      </div>

      {/* Link */}
      <div className="relative">
        <button type="button" title="Link" onClick={() => toggle("link")} className={btn(!!shape.link || open === "link")}>
          <Link2 className="size-4" />
        </button>
        {open === "link" ? (
          <Pop>
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const url = (new FormData(e.currentTarget).get("url") as string).trim();
                setShape({ link: url || undefined });
                setOpen(null);
              }}
            >
              <input
                name="url"
                defaultValue={shape.link ?? ""}
                placeholder="https://…"
                autoFocus
                className="w-48 rounded-md border border-hairline bg-background px-2 py-1 text-sm outline-none focus:border-ink/30"
              />
              <button type="submit" className="rounded-md bg-ink px-2 py-1 text-xs text-white">Add</button>
            </form>
          </Pop>
        ) : null}
      </div>

      {/* Lock */}
      <button
        type="button"
        title={shape.locked ? "Unlock" : "Lock"}
        onClick={() => useBoardStore.getState().setLocked([shape.id], !shape.locked)}
        className={btn(shape.locked)}
      >
        {shape.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
      </button>

      <Sep />
      <button
        type="button"
        title="Delete"
        onClick={() => {
          useBoardStore.getState().removeShape(shape.id);
          useUiStore.getState().setSelection([]);
        }}
        className={btn()}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
