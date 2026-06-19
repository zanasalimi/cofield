/**
 * The per-item context toolbar (Miro convention) above a single selected shape.
 * Built from shadcn primitives. Adapts to the shape: switch type, fill (incl.
 * transparent), font family / size, a font-style popover (bold/italic/underline/
 * strike), horizontal + vertical alignment, text colour, line colour + width for
 * connectors, opacity, exact resize, link, lock and delete.
 */
"use client";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Link2,
  Lock,
  Unlock,
  Trash2,
  Minus,
  Plus,
  Droplets,
  Scaling,
  ChevronDown,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  StickyNote,
  Type,
} from "lucide-react";
import type { Shape, ShapeStyle, ShapeType } from "@/collab/types";
import { FONT_NAMES, fontStack } from "./fonts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

const FILL_COLORS = [
  "#FFE8A3", "#FF9F1C", "#FFC2D1", "#F8B4B4", "#BBE5B3",
  "#A7E8E0", "#BFE3FF", "#D9C2FF", "#E7E5E0", "#FFFFFF",
  "#1A1A1A", "#6B6B66", "#E03E3E", "#0F9D58", "#4262FF",
];
const TEXT_COLORS = ["#1A1A1A", "#FFFFFF", "#6B6B66", "#E03E3E", "#F59E0B", "#0F9D58", "#2D9CDB", "#5B5BD6", "#C44CD9"];
const LINE_COLORS = ["#37352F", "#1A1A1A", "#4262FF", "#E03E3E", "#0F9D58", "#F59E0B", "#9333EA", "#6B6B66"];
const WIDTHS = [2, 3.5, 5];
const LABELLED = new Set(["rect", "ellipse", "triangle", "diamond", "star", "sticky", "text"]);
const TYPE_OPTIONS: { type: ShapeType; Icon: typeof Square; label: string }[] = [
  { type: "rect", Icon: Square, label: "Rectangle" },
  { type: "ellipse", Icon: Circle, label: "Ellipse" },
  { type: "triangle", Icon: Triangle, label: "Triangle" },
  { type: "diamond", Icon: Diamond, label: "Diamond" },
  { type: "star", Icon: Star, label: "Star" },
  { type: "sticky", Icon: StickyNote, label: "Sticky" },
  { type: "text", Icon: Type, label: "Text" },
];

function ColorGrid({ colors, onPick, withNone }: { colors: string[]; onPick: (c: string) => void; withNone?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {withNone ? (
        <button
          type="button"
          onClick={() => onPick("transparent")}
          title="No fill"
          className="grid size-8 place-items-center rounded-md border border-black/10 transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, transparent 44%, #E03E3E 44%, #E03E3E 56%, transparent 56%)" }}
          aria-label="No fill"
        />
      ) : null}
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="size-8 rounded-md border border-black/10 transition-transform hover:scale-110 active:scale-95"
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
  const canSwitch = LABELLED.has(shape.type);
  const fs = st.fontSize ?? (shape.type === "text" ? 16 : 14);

  let world = { x: shape.x + shape.w / 2, y: shape.y };
  if (isConnector) {
    const a = shapes.find((s) => s.id === shape.from);
    const b = shapes.find((s) => s.id === shape.to);
    if (a && b) world = { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: Math.min(a.y, b.y) };
  }
  const anchor = worldToScreen(viewport, world);
  const Sep = () => <div className="mx-0.5 h-7 w-px bg-hairline" />;
  const iconBtn = "[&_svg]:size-5";
  const CurType = TYPE_OPTIONS.find((t) => t.type === shape.type)?.Icon ?? Square;

  return (
    <div
      className="animate-pop pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-1 rounded-[20px] border border-hairline bg-chrome p-2 shadow-toolbar"
      style={{ left: anchor.x, top: Math.max(8, anchor.y - 76) }}
    >
      {canSwitch ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="lg" title="Switch type" className="gap-1 px-2.5">
                <CurType className="size-5" />
                <ChevronDown className="size-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40">
              <div className="grid grid-cols-4 gap-1">
                {TYPE_OPTIONS.map(({ type, Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    title={label}
                    onClick={() => setShape({ type })}
                    className={`grid size-10 place-items-center rounded-lg transition-colors hover:bg-muted ${shape.type === type ? "bg-muted text-ink" : "text-ink-soft"}`}
                  >
                    <Icon className="size-5" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Sep />
        </>
      ) : null}

      {hasFill ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-lg" title="Fill colour">
              <span
                className="size-6 rounded-md border border-black/15"
                style={st.fill === "transparent" ? { background: "linear-gradient(135deg,#fff 44%,#E03E3E 44%,#E03E3E 56%,#fff 56%)" } : { background: st.fill }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <ColorGrid colors={FILL_COLORS} withNone onPick={(c) => set({ fill: c })} />
          </PopoverContent>
        </Popover>
      ) : null}

      {isConnector ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Line colour">
                <span className="size-6 rounded-full border border-black/15" style={{ background: st.stroke }} />
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
              <span className="rounded-full bg-current" style={{ width: 18, height: 2 + i * 2 }} />
            </Button>
          ))}
        </>
      ) : null}

      {hasText ? (
        <>
          {hasFill ? <Sep /> : null}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="lg" className="gap-1.5 px-3" title="Font">
                <span className="text-base" style={{ fontFamily: fontStack(st.fontFamily) }}>{st.fontFamily ?? "Geist"}</span>
                <ChevronDown className="size-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              <div className="flex flex-col">
                {FONT_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => set({ fontFamily: name })}
                    className={`rounded-md px-2.5 py-2 text-left text-base transition-colors hover:bg-muted ${(st.fontFamily ?? "Geist") === name ? "bg-muted" : ""}`}
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
          <span className="w-9 text-center text-base tabular-nums text-ink">{fs}</span>
          <Button variant="ghost" size="icon-lg" title="Larger" className={iconBtn} onClick={() => set({ fontSize: Math.min(96, fs + 2) })}>
            <Plus />
          </Button>

          <Sep />
          {/* Font style: bold / italic / underline / strikethrough */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Font style" className={`${iconBtn} ${st.bold || st.italic || st.underline || st.strike ? "bg-muted" : ""}`}>
                <Bold />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex gap-0.5 p-1">
              <Button variant="ghost" size="icon-lg" title="Bold" className={`${iconBtn} ${st.bold ? "bg-muted" : ""}`} onClick={() => set({ bold: !st.bold })}><Bold /></Button>
              <Button variant="ghost" size="icon-lg" title="Italic" className={`${iconBtn} ${st.italic ? "bg-muted" : ""}`} onClick={() => set({ italic: !st.italic })}><Italic /></Button>
              <Button variant="ghost" size="icon-lg" title="Underline" className={`${iconBtn} ${st.underline ? "bg-muted" : ""}`} onClick={() => set({ underline: !st.underline })}><Underline /></Button>
              <Button variant="ghost" size="icon-lg" title="Strikethrough" className={`${iconBtn} ${st.strike ? "bg-muted" : ""}`} onClick={() => set({ strike: !st.strike })}><Strikethrough /></Button>
            </PopoverContent>
          </Popover>

          {/* Alignment: horizontal + vertical */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Alignment" className={iconBtn}>
                {st.align === "center" ? <AlignCenter /> : st.align === "right" ? <AlignRight /> : <AlignLeft />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex flex-col gap-1 p-1.5">
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon-lg" title="Left" className={`${iconBtn} ${(st.align ?? "left") === "left" ? "bg-muted" : ""}`} onClick={() => set({ align: "left" })}><AlignLeft /></Button>
                <Button variant="ghost" size="icon-lg" title="Centre" className={`${iconBtn} ${st.align === "center" ? "bg-muted" : ""}`} onClick={() => set({ align: "center" })}><AlignCenter /></Button>
                <Button variant="ghost" size="icon-lg" title="Right" className={`${iconBtn} ${st.align === "right" ? "bg-muted" : ""}`} onClick={() => set({ align: "right" })}><AlignRight /></Button>
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon-lg" title="Top" className={`${iconBtn} ${st.valign === "top" ? "bg-muted" : ""}`} onClick={() => set({ valign: "top" })}><AlignStartHorizontal /></Button>
                <Button variant="ghost" size="icon-lg" title="Middle" className={`${iconBtn} ${(st.valign ?? "middle") === "middle" ? "bg-muted" : ""}`} onClick={() => set({ valign: "middle" })}><AlignCenterHorizontal /></Button>
                <Button variant="ghost" size="icon-lg" title="Bottom" className={`${iconBtn} ${st.valign === "bottom" ? "bg-muted" : ""}`} onClick={() => set({ valign: "bottom" })}><AlignEndHorizontal /></Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Text colour">
                <span className="text-[20px] font-semibold leading-none" style={{ color: st.textColor ?? "#1A1A1A" }}>A</span>
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
            <Slider min={10} max={100} value={[Math.round((st.opacity ?? 1) * 100)]} onValueChange={([v]) => set({ opacity: (v ?? 100) / 100 })} />
            <span className="w-9 text-right text-sm tabular-nums text-ink-soft">{Math.round((st.opacity ?? 1) * 100)}%</span>
          </div>
        </PopoverContent>
      </Popover>

      {!isConnector ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-lg" title="Resize" className={iconBtn}>
              <Scaling />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-ink-soft">
              W
              <Input
                type="number"
                value={Math.round(shape.w)}
                onChange={(e) => setShape({ w: Math.max(8, Number(e.target.value) || 8) })}
                className="h-8 w-20"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-soft">
              H
              <Input
                type="number"
                value={Math.round(shape.h)}
                onChange={(e) => setShape({ h: Math.max(8, Number(e.target.value) || 8) })}
                className="h-8 w-20"
              />
            </label>
          </PopoverContent>
        </Popover>
      ) : null}

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
            <Button type="submit" size="sm">Save</Button>
          </form>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon-lg" title={shape.locked ? "Unlock" : "Lock"} className={`${iconBtn} ${shape.locked ? "bg-muted" : ""}`} onClick={() => useBoardStore.getState().setLocked([shape.id], !shape.locked)}>
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
