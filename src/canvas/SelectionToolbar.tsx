/**
 * The per-item context toolbar (Miro convention) above a single selected shape.
 * Built from shadcn primitives (Button, Popover, Slider). Adapts to the shape:
 * fill, font family / size / bold / align / colour for anything with text, line
 * colour + width for connectors, plus opacity, link, lock and delete.
 */
"use client";

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
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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

function ColorGrid({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="size-7 rounded-md border border-black/10 transition-transform hover:scale-110 active:scale-95"
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

  if (selection.length !== 1 || editingId) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape) return null;

  const st = shape.style;
  const set = (patch: Partial<ShapeStyle>) => useBoardStore.getState().updateShape(shape.id, { style: { ...st, ...patch } });
  const setShape = (patch: Partial<Shape>) => useBoardStore.getState().updateShape(shape.id, patch);

  const isConnector = shape.type === "connector";
  const isImage = shape.type === "image";
  const hasFill = !isConnector && !isImage && shape.type !== "text";
  const hasText = LABELLED.has(shape.type);
  const fs = st.fontSize ?? (shape.type === "text" ? 16 : 14);

  let world = { x: shape.x + shape.w / 2, y: shape.y };
  if (isConnector) {
    const a = shapes.find((s) => s.id === shape.from);
    const b = shapes.find((s) => s.id === shape.to);
    if (a && b) world = { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: Math.min(a.y, b.y) };
  }
  const anchor = worldToScreen(viewport, world);
  const Sep = () => <div className="mx-0.5 h-6 w-px bg-hairline" />;
  const iconBtn = "[&_svg]:size-[18px]";

  return (
    <div
      className="animate-pop pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-hairline bg-chrome p-1.5 shadow-toolbar"
      style={{ left: anchor.x, top: Math.max(8, anchor.y - 64) }}
    >
      {hasFill ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-lg" title="Fill colour">
              <span className="size-5 rounded-md border border-black/15" style={{ background: st.fill }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <ColorGrid colors={FILL_COLORS} onPick={(c) => set({ fill: c })} />
          </PopoverContent>
        </Popover>
      ) : null}

      {isConnector ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Line colour">
                <span className="size-5 rounded-full border border-black/15" style={{ background: st.stroke }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <ColorGrid colors={LINE_COLORS} onPick={(c) => set({ stroke: c })} />
            </PopoverContent>
          </Popover>
          {WIDTHS.map((w, i) => (
            <Button
              key={w}
              variant="ghost"
              size="icon-lg"
              title={`Line ${["thin", "medium", "thick"][i]}`}
              onClick={() => set({ strokeWidth: w })}
              className={Math.abs((st.strokeWidth ?? 2) - w) < 0.6 ? "bg-muted" : ""}
            >
              <span className="rounded-full bg-current" style={{ width: 16, height: 1 + i * 2 }} />
            </Button>
          ))}
        </>
      ) : null}

      {hasText ? (
        <>
          {hasFill ? <Sep /> : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="lg" className="gap-1.5 px-2.5">
                <span className="text-sm" style={{ fontFamily: fontStack(st.fontFamily) }}>{st.fontFamily ?? "Geist"}</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              <div className="flex flex-col">
                {FONT_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => set({ fontFamily: name })}
                    className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                      (st.fontFamily ?? "Geist") === name ? "bg-muted" : ""
                    }`}
                    style={{ fontFamily: fontStack(name) }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Sep />
          <Button variant="ghost" size="icon-lg" title="Smaller" className={iconBtn} onClick={() => set({ fontSize: Math.max(8, fs - 2) })}>
            <Minus />
          </Button>
          <span className="w-7 text-center text-sm tabular-nums text-ink">{fs}</span>
          <Button variant="ghost" size="icon-lg" title="Larger" className={iconBtn} onClick={() => set({ fontSize: Math.min(96, fs + 2) })}>
            <Plus />
          </Button>

          <Sep />
          <Button variant="ghost" size="icon-lg" title="Bold" className={`${iconBtn} ${st.bold ? "bg-muted" : ""}`} onClick={() => set({ bold: !st.bold })}>
            <Bold />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            title="Align"
            className={iconBtn}
            onClick={() => {
              const order = ["left", "center", "right"] as const;
              set({ align: order[(order.indexOf(st.align ?? "left") + 1) % order.length] });
            }}
          >
            {st.align === "center" ? <AlignCenter /> : st.align === "right" ? <AlignRight /> : <AlignLeft />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Text colour">
                <span className="text-[17px] font-semibold leading-none" style={{ color: st.textColor ?? "#1A1A1A" }}>A</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <ColorGrid colors={TEXT_COLORS} onPick={(c) => set({ textColor: c })} />
            </PopoverContent>
          </Popover>
        </>
      ) : null}

      <Sep />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-lg" title="Opacity" className={iconBtn}>
            <Droplets />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48">
          <div className="flex items-center gap-3 px-1">
            <Slider
              min={10}
              max={100}
              value={[Math.round((st.opacity ?? 1) * 100)]}
              onValueChange={([v]) => set({ opacity: (v ?? 100) / 100 })}
            />
            <span className="w-9 text-right text-sm tabular-nums text-ink-soft">{Math.round((st.opacity ?? 1) * 100)}%</span>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-lg" title="Link" className={`${iconBtn} ${shape.link ? "text-primary" : ""}`}>
            <Link2 />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const url = (new FormData(e.currentTarget).get("url") as string).trim();
              setShape({ link: url || undefined });
            }}
          >
            <Input name="url" defaultValue={shape.link ?? ""} placeholder="https://…" autoFocus className="h-8 w-52" />
            <Button type="submit" size="sm">Add</Button>
          </form>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon-lg"
        title={shape.locked ? "Unlock" : "Lock"}
        className={`${iconBtn} ${shape.locked ? "bg-muted" : ""}`}
        onClick={() => useBoardStore.getState().setLocked([shape.id], !shape.locked)}
      >
        {shape.locked ? <Unlock /> : <Lock />}
      </Button>

      <Sep />
      <Button
        variant="ghost"
        size="icon-lg"
        title="Delete"
        className={iconBtn}
        onClick={() => {
          useBoardStore.getState().removeShape(shape.id);
          useUiStore.getState().setSelection([]);
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
