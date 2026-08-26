/**
 * The per-item context toolbar (Miro convention) above a single selected shape.
 * Built from shadcn primitives. Adapts to the shape: switch type, fill (incl.
 * transparent), font family / size, a font-style popover (bold/italic/underline/
 * strike), horizontal + vertical alignment, text colour, line colour + width for
 * connectors, opacity, exact resize, link, lock and delete.
 */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Link2, Lock, Unlock, Trash2, Minus, Plus, Droplets, Scaling, ChevronDown, Square, Circle, Triangle, Diamond, Star, StickyNote, Type, Pipette, MessageSquarePlus, Spline, CornerDownRight, ArrowRight, ChevronRight, ArrowRightLeft } from "@/components/icons";
import type { Shape, ShapeStyle, ShapeType, ArrowHead } from "@/collab/types";
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
      {/* Custom colour: a clean rainbow chip (no default input chrome). */}
      <label
        title="Custom colour"
        className="grid size-8 cursor-pointer place-items-center rounded-md text-white transition-transform hover:scale-110 active:scale-95"
        style={{ background: "conic-gradient(from 90deg, #ff5c5c, #ffd93b, #6ddf6d, #4dd0e1, #5b8cff, #c44cd9, #ff5c5c)" }}
      >
        <Pipette className="size-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
        <input type="color" onChange={(e) => onPick(e.target.value)} className="sr-only" aria-label="Pick a custom colour" />
      </label>
    </div>
  );
}

const ARROW_OPTS: { v: ArrowHead; Icon: typeof Minus; label: string }[] = [
  { v: "none", Icon: Minus, label: "None" },
  { v: "arrow", Icon: ArrowRight, label: "Arrow" },
  { v: "open", Icon: ChevronRight, label: "Open" },
  { v: "circle", Icon: Circle, label: "Circle" },
  { v: "diamond", Icon: Diamond, label: "Diamond" },
];

/** A labelled row of endpoint-marker choices (start or end). */
function ArrowRow({ label, value, onPick }: { label: string; value: ArrowHead; onPick: (a: ArrowHead) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-8 text-xs text-ink-soft">{label}</span>
      {ARROW_OPTS.map(({ v, Icon, label: l }) => (
        <button
          key={v}
          type="button"
          title={l}
          onClick={() => onPick(v)}
          className={`grid size-8 place-items-center rounded-lg transition-colors hover:bg-muted ${value === v ? "bg-muted text-ink" : "text-ink-soft"}`}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

/** Three inline line-style buttons (solid / dashed / dotted). */
function DashControl({ value, onPick }: { value?: "solid" | "dashed" | "dotted"; onPick: (d: "solid" | "dashed" | "dotted") => void }) {
  const cur = value ?? "solid";
  return (
    <div className="flex items-center gap-0.5">
      {(["solid", "dashed", "dotted"] as const).map((d) => (
        <button
          key={d}
          type="button"
          title={`${d[0]!.toUpperCase()}${d.slice(1)} line`}
          onClick={() => onPick(d)}
          className={`grid h-9 flex-1 place-items-center rounded-lg transition-colors hover:bg-muted ${cur === d ? "bg-muted text-ink" : "text-ink-soft"}`}
        >
          <span className="w-5 border-t-2 border-current" style={{ borderTopStyle: d }} />
        </button>
      ))}
    </div>
  );
}

/** Stroke width buttons, optionally with a "None" (0 width) choice for borders. */
function WidthControl({ value, onPick, withNone }: { value?: number; onPick: (w: number) => void; withNone?: boolean }) {
  const v = value ?? 2;
  return (
    <div className="flex items-center gap-1">
      {withNone ? (
        <button
          type="button"
          title="No border"
          onClick={() => onPick(0)}
          className={`grid h-9 flex-1 place-items-center rounded-lg text-xs transition-colors hover:bg-muted ${v === 0 ? "bg-muted text-ink" : "text-ink-soft"}`}
        >
          None
        </button>
      ) : null}
      {WIDTHS.map((w, i) => (
        <button
          key={w}
          type="button"
          title={["Thin", "Medium", "Thick"][i]}
          onClick={() => onPick(w)}
          className={`grid h-9 flex-1 place-items-center rounded-lg transition-colors hover:bg-muted ${Math.abs(v - w) < 0.6 ? "bg-muted text-ink" : "text-ink-soft"}`}
        >
          <span className="rounded-full bg-current" style={{ width: 18, height: 1 + i * 2 }} />
        </button>
      ))}
    </div>
  );
}

function MenuRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span className="shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="mb-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-soft/70">{title}</h3>
      {children}
    </section>
  );
}

export function SelectionToolbar() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);

  const selectedId = selection.length === 1 ? selection[0] : undefined;
  const shape = selectedId ? shapes.find((s) => s.id === selectedId) : undefined;
  // Show for the selected shape unless THAT shape is being text-edited. (A stale
  // editingId pointing at a different/old shape must not suppress the toolbar.)
  const visible = !!shape && editingId !== shape.id;

  // The bar is centred on the shape, so one near an edge would hang half of
  // itself off-screen. Its width varies with the shape type and rewraps as the
  // window narrows, so it is measured rather than assumed; the observer catches
  // the rewrap, and the deps catch the bar appearing on a different shape.
  // The full row measures about 881px with every control present. Above that it
  // stays inline; below, the secondary controls move into a labelled panel.
  // Decided in JS rather than CSS so only one set is ever in the DOM, which
  // also keeps the duplicates out of the accessibility tree.
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 940px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ half: 0, height: 0, bound: 0, boundY: 0 });
  // Which sides still have controls out of view. A row that is simply cut off
  // at the edge reads as broken rather than scrollable.
  const [more, setMore] = useState({ start: false, end: false });
  const readEdges = () => {
    const el = boxRef.current;
    if (!el) return;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setMore((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const parent = el.offsetParent as HTMLElement | null;
      const next = {
        half: el.offsetWidth / 2,
        height: el.offsetHeight,
        bound: parent ? parent.clientWidth : window.innerWidth,
        boundY: parent ? parent.clientHeight : window.innerHeight,
      };
      setFit((prev) =>
        Math.abs(prev.half - next.half) > 0.5 ||
        Math.abs(prev.height - next.height) > 0.5 ||
        prev.bound !== next.bound ||
        prev.boundY !== next.boundY
          ? next
          : prev,
      );
    };
    measure();
    readEdges();
    const observer = new ResizeObserver(() => {
      measure();
      readEdges();
    });
    observer.observe(el);
    if (el.offsetParent) observer.observe(el.offsetParent as HTMLElement);
    return () => observer.disconnect();
  }, [visible, shape?.type]);

  if (!visible || !shape) return null;

  const st = shape.style;
  const set = (patch: Partial<ShapeStyle>) => useBoardStore.getState().updateShape(shape.id, { style: { ...st, ...patch } });
  const setShape = (patch: Partial<Shape>) => useBoardStore.getState().updateShape(shape.id, patch);

  const isConnector = shape.type === "connector";
  const isImage = shape.type === "image";
  const isDraw = shape.type === "draw";
  const isComponent = shape.type === "component";
  const isLine = isConnector || isDraw; // stroke-only objects (no fill, no border box)
  // Components draw via their own props (the Inspector), so fill/border here are no-ops.
  const hasFill = !isLine && !isImage && !isComponent && shape.type !== "text";
  const hasBorder = hasFill; // a filled shape has an editable border
  const hasText = LABELLED.has(shape.type);
  const canSwitch = LABELLED.has(shape.type);
  const fs = st.fontSize ?? (shape.type === "text" ? 16 : 14);

  let world = { x: shape.x + shape.w / 2, y: shape.y };
  let worldBottom = shape.y + shape.h;
  if (isConnector) {
    const a = shapes.find((s) => s.id === shape.from);
    const b = shapes.find((s) => s.id === shape.to);
    if (a && b) {
      world = { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: Math.min(a.y, b.y) };
      worldBottom = Math.max(a.y + a.h, b.y + b.h);
    }
  }
  const anchor = worldToScreen(viewport, world);
  const shapeBottom = worldToScreen(viewport, { x: world.x, y: worldBottom }).y;
  const GUTTER = 8;
  const lo = fit.half + GUTTER;
  const hi = fit.bound - fit.half - GUTTER;
  // `fit.half` is 0 on the very first paint, before the measure lands.
  const left = fit.half > 0 ? Math.min(Math.max(anchor.x, lo), Math.max(lo, hi)) : anchor.x;

  // The bar wraps to several rows on a narrow screen, so a fixed offset above
  // the shape ends up laid straight over it. Sit fully above when there is room,
  // otherwise below, and only overlap when the shape fills the viewport.
  const GAP = 12;
  const above = anchor.y - fit.height - GAP;
  const below = shapeBottom + GAP;
  const fadeStart = "transparent 0, #000 20px";
  const fadeEnd = "#000 calc(100% - 20px), transparent 100%";
  const mask =
    more.start && more.end
      ? `linear-gradient(90deg, ${fadeStart}, ${fadeEnd})`
      : more.end
        ? `linear-gradient(90deg, #000 0, ${fadeEnd})`
        : more.start
          ? `linear-gradient(90deg, ${fadeStart}, #000 100%)`
          : undefined;

  const top =
    fit.height === 0
      ? Math.max(GUTTER, anchor.y - 76)
      : above >= GUTTER
        ? above
        : below + fit.height <= fit.boundY - GUTTER
          ? below
          : Math.max(GUTTER, Math.min(above, fit.boundY - fit.height - GUTTER));
  const Sep = () => <div className="mx-0.5 h-7 w-px bg-hairline" />;
  const iconBtn = "[&_svg]:size-5";
  const CurType = TYPE_OPTIONS.find((t) => t.type === shape.type)?.Icon ?? Square;

  return (
    <div
      ref={boxRef}
      // One row that scrolls, not a block that wraps. Wrapping turned fourteen
      // controls into a 300px slab that buried the shape it was editing; a
      // single row stays about 56px tall whatever the width. Safe to clip here
      // because every popover inside renders through a portal.
      className="animate-pop pointer-events-auto absolute z-10 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain rounded-[20px] border border-hairline bg-chrome p-2 shadow-toolbar [scrollbar-width:none] [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden"
      onScroll={readEdges}
      style={{ left, top, maskImage: mask, WebkitMaskImage: mask }}
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

      {isLine ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title={isDraw ? "Pen colour" : "Line colour"}>
                <span className="size-6 rounded-full border border-black/15" style={{ background: st.stroke }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <ColorGrid colors={LINE_COLORS} onPick={(c) => set({ stroke: c })} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Line style" className={iconBtn}>
                <span className="w-5 border-t-2 border-current" style={{ borderTopStyle: st.strokeDash === "dotted" ? "dotted" : st.strokeDash === "dashed" ? "dashed" : "solid" }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-52 flex-col gap-2.5">
              <WidthControl value={st.strokeWidth} onPick={(w) => set({ strokeWidth: w })} />
              {!isDraw ? <DashControl value={st.strokeDash} onPick={(d) => set({ strokeDash: d })} /> : null}
            </PopoverContent>
          </Popover>
        </>
      ) : null}

      {isConnector ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Line shape" className={iconBtn}>
                <Spline />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex gap-1 p-1">
              {([["curved", "Curved", Spline], ["elbow", "Elbow", CornerDownRight], ["straight", "Straight", Minus]] as const).map(([r, label, Icon]) => (
                <Button
                  key={r}
                  variant="ghost"
                  size="icon-lg"
                  title={label}
                  className={`${iconBtn} ${(st.routing ?? "curved") === r ? "bg-muted" : ""}`}
                  onClick={() => set({ routing: r })}
                >
                  <Icon />
                </Button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-lg" title="Arrow ends" className={iconBtn}>
                <ArrowRight />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-auto flex-col gap-1.5 p-2">
              <ArrowRow label="Start" value={st.startArrow ?? "none"} onPick={(a) => set({ startArrow: a })} />
              <ArrowRow label="End" value={st.endArrow ?? "arrow"} onPick={(a) => set({ endArrow: a })} />
              <button
                type="button"
                onClick={() => set({ startArrow: st.endArrow ?? "arrow", endArrow: st.startArrow ?? "none" })}
                className="mt-0.5 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm text-ink-soft transition-colors hover:bg-muted"
              >
                <ArrowRightLeft className="size-4" /> Swap ends
              </button>
            </PopoverContent>
          </Popover>
        </>
      ) : null}

      {hasBorder ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-lg" title="Border">
              <span className="size-6 rounded-md border-[2.5px]" style={{ borderColor: st.stroke, borderStyle: st.strokeDash === "dotted" ? "dotted" : st.strokeDash === "dashed" ? "dashed" : "solid" }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-56 flex-col gap-2.5">
            <ColorGrid colors={LINE_COLORS} onPick={(c) => set({ stroke: c })} />
            <WidthControl value={st.strokeWidth} withNone onPick={(w) => set({ strokeWidth: w })} />
            <DashControl value={st.strokeDash} onPick={(d) => set({ strokeDash: d })} />
          </PopoverContent>
        </Popover>
      ) : null}

      {/* The full set, for viewports that can actually hold it. */}
      {wide ? (
        <>
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
          {/* The bar wraps on narrow screens, and a stepper split across two
              rows reads as three unrelated controls. Keep it one unit. */}
          <div className="flex shrink-0 items-center">
            <Button variant="ghost" size="icon-lg" title="Smaller" className={iconBtn} onClick={() => set({ fontSize: Math.max(8, fs - 2) })}>
              <Minus />
            </Button>
            <span className="w-9 text-center text-base tabular-nums text-ink">{fs}</span>
            <Button variant="ghost" size="icon-lg" title="Larger" className={iconBtn} onClick={() => set({ fontSize: Math.min(96, fs + 2) })}>
              <Plus />
            </Button>
          </div>

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

      <Button
        variant="ghost"
        size="icon-lg"
        title="Comment"
        className={iconBtn}
        onClick={() => {
          const id = useBoardStore.getState().addComment(shape.x + shape.w, shape.y);
          useUiStore.getState().setOpenCommentId(id);
        }}
      >
        <MessageSquarePlus />
      </Button>

      <Button variant="ghost" size="icon-lg" title={shape.locked ? "Unlock" : "Lock"} className={`${iconBtn} ${shape.locked ? "bg-muted" : ""}`} onClick={() => useBoardStore.getState().setLocked([shape.id], !shape.locked)}>
        {shape.locked ? <Unlock /> : <Lock />}
      </Button>
        </>
      ) : null}

      {/* Narrow viewports keep the shape's identity in the bar and nothing else.
          A strip of unlabelled icons was the problem, so the panel names every
          control and groups them under headings instead. */}
      {!wide ? (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-lg" title="More options" className={iconBtn}>
            <MoreHorizontal />
          </Button>
        </PopoverTrigger>
        {/* A fixed max-height still overflows when the shape sits low and Radix
            has to open downward, so cap to the room Radix actually measured and
            let the panel scroll inside that. */}
        <PopoverContent
          align="end"
          collisionPadding={12}
          className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(19rem,calc(100vw-1.5rem))] flex-col gap-4 overflow-y-auto"
        >
          {hasText ? (
            <MenuSection title="Text">
              <MenuRow label="Font">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 px-2.5">
                      <span style={{ fontFamily: fontStack(st.fontFamily) }}>{st.fontFamily ?? "Geist"}</span>
                      <ChevronDown className="size-3.5 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-40 p-1">
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
              </MenuRow>

              <MenuRow label="Size">
                <Button variant="ghost" size="icon" title="Smaller" onClick={() => set({ fontSize: Math.max(8, fs - 2) })}>
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-sm tabular-nums text-ink">{fs}</span>
                <Button variant="ghost" size="icon" title="Larger" onClick={() => set({ fontSize: Math.min(96, fs + 2) })}>
                  <Plus className="size-4" />
                </Button>
              </MenuRow>

              <MenuRow label="Style">
                <Button variant="ghost" size="icon" title="Bold" className={st.bold ? "bg-muted" : ""} onClick={() => set({ bold: !st.bold })}><Bold className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Italic" className={st.italic ? "bg-muted" : ""} onClick={() => set({ italic: !st.italic })}><Italic className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Underline" className={st.underline ? "bg-muted" : ""} onClick={() => set({ underline: !st.underline })}><Underline className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Strikethrough" className={st.strike ? "bg-muted" : ""} onClick={() => set({ strike: !st.strike })}><Strikethrough className="size-4" /></Button>
              </MenuRow>

              <MenuRow label="Align">
                <Button variant="ghost" size="icon" title="Left" className={(st.align ?? "left") === "left" ? "bg-muted" : ""} onClick={() => set({ align: "left" })}><AlignLeft className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Centre" className={st.align === "center" ? "bg-muted" : ""} onClick={() => set({ align: "center" })}><AlignCenter className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Right" className={st.align === "right" ? "bg-muted" : ""} onClick={() => set({ align: "right" })}><AlignRight className="size-4" /></Button>
                <div className="mx-1 h-5 w-px bg-hairline" />
                <Button variant="ghost" size="icon" title="Top" className={st.valign === "top" ? "bg-muted" : ""} onClick={() => set({ valign: "top" })}><AlignStartHorizontal className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Middle" className={(st.valign ?? "middle") === "middle" ? "bg-muted" : ""} onClick={() => set({ valign: "middle" })}><AlignCenterHorizontal className="size-4" /></Button>
                <Button variant="ghost" size="icon" title="Bottom" className={st.valign === "bottom" ? "bg-muted" : ""} onClick={() => set({ valign: "bottom" })}><AlignEndHorizontal className="size-4" /></Button>
              </MenuRow>

              <MenuRow label="Colour">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Text colour">
                      <span className="text-lg font-semibold leading-none" style={{ color: st.textColor ?? "#1A1A1A" }}>A</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end">
                    <ColorGrid colors={TEXT_COLORS} onPick={(c) => set({ textColor: c })} />
                  </PopoverContent>
                </Popover>
              </MenuRow>
            </MenuSection>
          ) : null}

          <MenuSection title="Shape">
            <MenuRow label="Opacity">
              <div className="flex w-40 items-center gap-2">
                <Slider min={10} max={100} value={[Math.round((st.opacity ?? 1) * 100)]} onValueChange={([v]) => set({ opacity: (v ?? 100) / 100 })} />
                <span className="w-9 text-right text-sm tabular-nums text-ink-soft">{Math.round((st.opacity ?? 1) * 100)}%</span>
              </div>
            </MenuRow>

            {!isConnector ? (
              <MenuRow label="Size">
                <Input
                  aria-label="Width"
                  type="number"
                  value={Math.round(shape.w)}
                  onChange={(e) => setShape({ w: Math.max(8, Number(e.target.value) || 8) })}
                  className="h-8 w-[4.5rem]"
                />
                <span className="px-1 text-sm text-ink-soft">x</span>
                <Input
                  aria-label="Height"
                  type="number"
                  value={Math.round(shape.h)}
                  onChange={(e) => setShape({ h: Math.max(8, Number(e.target.value) || 8) })}
                  className="h-8 w-[4.5rem]"
                />
              </MenuRow>
            ) : null}

            <MenuRow label="Link">
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const url = (new FormData(e.currentTarget).get("url") as string).trim();
                  setShape({ link: url || undefined });
                }}
              >
                <Input name="url" defaultValue={shape.link ?? ""} placeholder="https://..." className="h-8 w-36" />
                <Button type="submit" size="sm">Save</Button>
              </form>
            </MenuRow>
          </MenuSection>

          <div className="flex gap-2 border-t border-hairline pt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => {
                const id = useBoardStore.getState().addComment(shape.x + shape.w, shape.y);
                useUiStore.getState().setOpenCommentId(id);
              }}
            >
              <MessageSquarePlus className="size-4" />
              Comment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`flex-1 gap-1.5 ${shape.locked ? "bg-muted" : ""}`}
              onClick={() => useBoardStore.getState().setLocked([shape.id], !shape.locked)}
            >
              {shape.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
              {shape.locked ? "Unlock" : "Lock"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      ) : null}

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
