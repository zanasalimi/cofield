/**
 * The floating tool rail — a vertical column on the left (Miro convention).
 * Tools are grouped: the shape tools collapse into a flyout whose rail button
 * shows the active shape, and undo/redo sit at the foot. Buttons press in on
 * click for tactile feedback; the flyout scales in from the rail.
 */
"use client";

import { useState } from "react";
import {
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  MoveUpRight,
  Pencil,
  Shapes,
  MessageSquare,
  Undo2,
  Redo2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import type { ToolId } from "@/canvas/tools/types";

type Icon = typeof Square;

const SHAPE_TOOLS: { id: ToolId; label: string; Icon: Icon }[] = [
  { id: "rect", label: "Rectangle", Icon: Square },
  { id: "ellipse", label: "Ellipse", Icon: Circle },
  { id: "triangle", label: "Triangle", Icon: Triangle },
  { id: "diamond", label: "Diamond", Icon: Diamond },
  { id: "star", label: "Star", Icon: Star },
  { id: "arrow", label: "Arrow", Icon: MoveUpRight },
];
const SHAPE_IDS = new Set(SHAPE_TOOLS.map((t) => t.id));

function RailButton({
  active,
  label,
  shortcut,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`grid size-12 place-items-center rounded-xl transition-transform duration-100 active:scale-90 ${
            active ? "bg-ink/10 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
        {shortcut ? <span className="ml-1.5 opacity-60">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbar() {
  const activeTool = useUiStore((s) => s.activeTool);
  const setActiveTool = useUiStore((s) => s.setActiveTool);
  const commentMode = useUiStore((s) => s.commentMode);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [currentShape, setCurrentShape] = useState<{ id: ToolId; Icon: Icon }>({ id: "rect", Icon: Square });

  const pick = (id: ToolId) => {
    setActiveTool(id);
    useUiStore.getState().setCommentMode(false);
    setShapesOpen(false);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-chrome p-2 shadow-toolbar">
      <RailButton active={activeTool === "select"} label="Select" shortcut="V" onClick={() => pick("select")}>
        <MousePointer2 className="size-[22px]" />
      </RailButton>
      <RailButton active={activeTool === "pan"} label="Hand" shortcut="H" onClick={() => pick("pan")}>
        <Hand className="size-[22px]" />
      </RailButton>
      <RailButton active={activeTool === "sticky"} label="Sticky note" shortcut="S" onClick={() => pick("sticky")}>
        <StickyNote className="size-[22px]" />
      </RailButton>
      <RailButton active={activeTool === "text"} label="Text" shortcut="T" onClick={() => pick("text")}>
        <Type className="size-[22px]" />
      </RailButton>

      {/* Shapes flyout — rail button shows the active shape. */}
      <div className="relative">
        <RailButton
          active={SHAPE_IDS.has(activeTool)}
          label="Shapes"
          onClick={() => {
            setActiveTool(currentShape.id);
            setShapesOpen((o) => !o);
          }}
        >
          <span className="relative">
            <currentShape.Icon className="size-[22px]" />
            <Shapes className="absolute -bottom-1.5 -right-2 size-3 text-ink-soft" />
          </span>
        </RailButton>
        {shapesOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShapesOpen(false)} />
            <div className="animate-pop-left absolute left-full top-0 z-20 ml-2 flex flex-col gap-0.5 rounded-2xl border border-hairline bg-chrome p-1.5 shadow-toolbar">
              {SHAPE_TOOLS.map(({ id, label, Icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => {
                        setCurrentShape({ id, Icon });
                        pick(id);
                      }}
                      className={`grid size-12 place-items-center rounded-xl transition-transform duration-100 active:scale-90 ${
                        activeTool === id ? "bg-ink/10 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      <Icon className="size-[22px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <RailButton active={activeTool === "draw"} label="Pen" shortcut="P" onClick={() => pick("draw")}>
        <Pencil className="size-[22px]" />
      </RailButton>

      <RailButton
        active={commentMode}
        label="Comment"
        shortcut="C"
        onClick={() => useUiStore.getState().setCommentMode(!commentMode)}
      >
        <MessageSquare className="size-[22px]" />
      </RailButton>

      <div className="my-1 h-px w-7 bg-hairline" />

      <RailButton label="Undo" shortcut="⌘Z" onClick={() => useBoardStore.getState().undo()}>
        <Undo2 className="size-[22px]" />
      </RailButton>
      <RailButton label="Redo" shortcut="⌘⇧Z" onClick={() => useBoardStore.getState().redo()}>
        <Redo2 className="size-[22px]" />
      </RailButton>
    </div>
  );
}
