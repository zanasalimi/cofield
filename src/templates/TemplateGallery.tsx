/**
 * Template gallery — a bottom launcher that opens a categorised picker. Each
 * card shows a live SVG preview rendered from the template's own nodes/edges
 * (not a screenshot), so the thumbnails always match what gets imported.
 * Picking a template drops it onto the board, centred on the current view.
 */
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LayoutTemplate } from "@/components/icons";
import { useBoardStore } from "@/store/board-store";
import { useUiStore } from "@/store/ui-store";
import { screenToWorld } from "@/canvas/viewport/viewport";
import { TEMPLATES } from "./library";
import { CATEGORY_LABEL, type Template, type TemplateCategory } from "./types";

const TABS: { key: "all" | TemplateCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "uiux", label: CATEGORY_LABEL.uiux },
  { key: "flow", label: CATEGORY_LABEL.flow },
  { key: "uml", label: CATEGORY_LABEL.uml },
  { key: "cloud", label: CATEGORY_LABEL.cloud },
];

/** Mini vector preview built from the template's geometry. */
function Thumbnail({ tpl }: { tpl: Template }) {
  const pad = 28;
  const xs = tpl.nodes.flatMap((n) => [n.x, n.x + n.w]);
  const ys = tpl.nodes.flatMap((n) => [n.y, n.y + n.h]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const vbW = Math.max(...xs) - minX + pad * 2;
  const vbH = Math.max(...ys) - minY + pad * 2;
  const tx = (v: number) => v - minX + pad;
  const ty = (v: number) => v - minY + pad;
  const center = (ref: string) => {
    const n = tpl.nodes.find((x) => x.ref === ref);
    return n ? { x: tx(n.x + n.w / 2), y: ty(n.y + n.h / 2) } : null;
  };

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {(tpl.edges ?? []).map((e, i) => {
        const a = center(e.from);
        const b = center(e.to);
        if (!a || !b) return null;
        return (
          <line
            key={`e${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#94A3B8"
            strokeWidth={3}
            strokeDasharray={e.style?.strokeDash === "dashed" ? "9 7" : undefined}
          />
        );
      })}
      {tpl.nodes.map((n) => {
        const fill = n.style?.fill && n.style.fill !== "transparent" ? n.style.fill : "#FFFFFF";
        const stroke = n.style?.stroke && n.style.stroke !== "transparent" ? n.style.stroke : "#CBD5E1";
        const x = tx(n.x);
        const y = ty(n.y);
        const { w, h } = n;
        const common = { fill, stroke, strokeWidth: 3 } as const;
        if (n.type === "ellipse") return <ellipse key={n.ref} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />;
        if (n.type === "diamond")
          return <polygon key={n.ref} points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`} {...common} />;
        if (n.type === "triangle") return <polygon key={n.ref} points={`${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`} {...common} />;
        return <rect key={n.ref} x={x} y={y} width={w} height={h} rx={Math.min(14, h / 3)} {...common} />;
      })}
    </svg>
  );
}

export function TemplateGallery() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<"all" | TemplateCategory>("all");
  const shown = cat === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === cat);

  const importTemplate = (tpl: Template) => {
    const vp = useUiStore.getState().viewport;
    const canvas = typeof document !== "undefined" ? document.querySelector("canvas") : null;
    const origin = canvas
      ? screenToWorld(vp, { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 })
      : { x: vp.x + 400, y: vp.y + 300 };
    const ids = useBoardStore.getState().importTemplate(tpl, origin);
    useUiStore.getState().setSelection(ids);
    useUiStore.getState().setActiveTool("select");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-xl border border-hairline bg-chrome px-3.5 text-sm font-semibold text-ink shadow-toolbar transition-transform duration-100 hover:bg-ink/[0.03] active:scale-95"
        >
          <LayoutTemplate className="size-[18px] text-primary" />
          Templates
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="border-b border-hairline px-5 py-4">
          <DialogTitle className="text-base font-semibold">Templates</DialogTitle>
          <p className="text-xs text-ink-soft">Start from a professional diagram — it drops onto your board where you are.</p>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-hairline px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setCat(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                cat === t.key ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
          {shown.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => importTemplate(tpl)}
              className="group flex flex-col overflow-hidden rounded-xl border border-hairline bg-white text-left transition-all duration-150 hover:border-primary/40 hover:shadow-toolbar active:scale-[0.98]"
            >
              <div className="aspect-[4/3] w-full overflow-hidden border-b border-hairline bg-[#FAFAF7] p-3">
                <Thumbnail tpl={tpl} />
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">{tpl.name}</p>
                <p className="truncate text-xs text-ink-soft">{tpl.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
