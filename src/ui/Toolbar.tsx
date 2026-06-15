/**
 * The floating toolbar — the signature chrome. Floats over the canvas with
 * layered depth (shadow-toolbar), not glassmorphism. Every control here is a
 * shadcn component themed by the preset; only the canvas itself is custom.
 */
"use client";

import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  MoveUpRight,
  Pencil,
  StickyNote,
  Type,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useUiStore } from "@/store/ui-store";
import type { ToolId } from "@/canvas/tools/types";

const TOOLS: { id: ToolId; label: string; key: string; Icon: typeof Square }[] = [
  { id: "select", label: "Select", key: "V", Icon: MousePointer2 },
  { id: "pan", label: "Hand", key: "H", Icon: Hand },
  { id: "rect", label: "Rectangle", key: "R", Icon: Square },
  { id: "ellipse", label: "Ellipse", key: "O", Icon: Circle },
  { id: "arrow", label: "Arrow", key: "L", Icon: MoveUpRight },
  { id: "draw", label: "Draw", key: "P", Icon: Pencil },
  { id: "sticky", label: "Sticky note", key: "S", Icon: StickyNote },
  { id: "text", label: "Text", key: "T", Icon: Type },
];

export function Toolbar() {
  const activeTool = useUiStore((s) => s.activeTool);
  const setActiveTool = useUiStore((s) => s.setActiveTool);
  const zoom = useUiStore((s) => s.viewport.zoom);

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-hairline bg-chrome px-1.5 py-1.5 shadow-toolbar">
      <ToggleGroup
        type="single"
        value={activeTool}
        onValueChange={(v) => v && setActiveTool(v as ToolId)}
        className="gap-0.5"
      >
        {TOOLS.map(({ id, label, key, Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={id} aria-label={label} className="size-9 rounded-lg">
                <Icon className="size-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="top">
              {label} <span className="ml-1 opacity-60">{key}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <span className="tabular-nums px-2 text-xs text-muted-foreground select-none" aria-label="Zoom level">
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
}
