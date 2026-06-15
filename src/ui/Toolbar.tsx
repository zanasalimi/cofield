/**
 * The floating tool rail — a vertical column on the left, the Miro convention.
 * Every control is a shadcn component on the preset; only the canvas is custom.
 * Tools press in slightly on click for tactile feedback.
 */
"use client";

import { MousePointer2, Hand, Square, Circle, MoveUpRight, Pencil, StickyNote, Type } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/store/ui-store";
import type { ToolId } from "@/canvas/tools/types";

const TOOLS: { id: ToolId; label: string; key: string; Icon: typeof Square }[] = [
  { id: "select", label: "Select", key: "V", Icon: MousePointer2 },
  { id: "pan", label: "Hand", key: "H", Icon: Hand },
  { id: "sticky", label: "Sticky note", key: "S", Icon: StickyNote },
  { id: "text", label: "Text", key: "T", Icon: Type },
  { id: "rect", label: "Rectangle", key: "R", Icon: Square },
  { id: "ellipse", label: "Ellipse", key: "O", Icon: Circle },
  { id: "arrow", label: "Arrow", key: "L", Icon: MoveUpRight },
  { id: "draw", label: "Draw", key: "P", Icon: Pencil },
];

export function Toolbar() {
  const activeTool = useUiStore((s) => s.activeTool);
  const setActiveTool = useUiStore((s) => s.setActiveTool);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-chrome p-1.5 shadow-toolbar">
      <ToggleGroup
        type="single"
        value={activeTool}
        onValueChange={(v) => v && setActiveTool(v as ToolId)}
        className="flex-col gap-0.5"
      >
        {TOOLS.map(({ id, label, key, Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={id}
                aria-label={label}
                className="size-10 rounded-xl transition-transform duration-100 active:scale-90"
              >
                <Icon className="size-[18px]" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {label} <span className="ml-1 opacity-60">{key}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </div>
  );
}
