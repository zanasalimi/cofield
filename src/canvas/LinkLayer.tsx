/**
 * Clickable link badges. Any shape carrying a link shows a small link button at
 * its top-right corner; clicking it opens the URL in a new tab (Miro behaviour).
 */
"use client";

import { Link2 } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

function href(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function LinkLayer() {
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);
  const linked = shapes.filter((s) => s.link && s.type !== "connector");
  if (linked.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {linked.map((s) => {
        const p = worldToScreen(viewport, { x: s.x + s.w, y: s.y });
        return (
          <a
            key={s.id}
            href={href(s.link!)}
            target="_blank"
            rel="noreferrer"
            title={s.link}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-chrome text-ink-soft shadow-sm transition-transform duration-100 hover:scale-110 hover:text-primary active:scale-90"
            style={{ left: p.x - 3, top: p.y + 3 }}
          >
            <Link2 className="size-3" />
          </a>
        );
      })}
    </div>
  );
}
