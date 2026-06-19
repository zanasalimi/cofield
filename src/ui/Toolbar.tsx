/**
 * The main tool bar — a horizontal pill centred along the bottom (BrainScape /
 * FigJam convention). Shape tools collapse into a flyout that scales up from the
 * bar and shows the active shape. The comment tool arms click-to-pin.
 */
"use client";

import { useState } from "react";
import {
  Cursor as MousePointer2,
  Hand,
  TextT as Type,
  Note as StickyNote,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  ArrowUpRight as MoveUpRight,
  PencilSimple as Pencil,
  Shapes,
  ChatCircle as MessageSquare,
  PlusSquare as SquarePlus,
} from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/store/ui-store";
import type { ToolId } from "@/canvas/tools/types";
import "@/canvas/components";
import { componentList } from "@/canvas/components/registry";

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

function ToolButton({
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
            active ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
        {shortcut ? <span className="ml-1.5 opacity-60">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbar() {
  const activeTool = useUiStore((s) => s.activeTool);
  const commentMode = useUiStore((s) => s.commentMode);
  const pendingInsert = useUiStore((s) => s.pendingInsert);
  const setActiveTool = useUiStore((s) => s.setActiveTool);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [currentShape, setCurrentShape] = useState<{ id: ToolId; Icon: Icon }>({ id: "rect", Icon: Square });

  const pick = (id: ToolId) => {
    setActiveTool(id);
    useUiStore.getState().setCommentMode(false);
    setShapesOpen(false);
  };

  const Sep = () => <div className="mx-1 h-7 w-px bg-hairline" />;

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-hairline bg-chrome p-2 shadow-toolbar">
      <ToolButton active={activeTool === "select" && !commentMode} label="Select" shortcut="V" onClick={() => pick("select")}>
        <MousePointer2 className="size-[22px]" />
      </ToolButton>
      <ToolButton active={activeTool === "pan"} label="Hand" shortcut="H" onClick={() => pick("pan")}>
        <Hand className="size-[22px]" />
      </ToolButton>

      <Sep />

      <ToolButton active={activeTool === "text"} label="Text" shortcut="T" onClick={() => pick("text")}>
        <Type className="size-[22px]" />
      </ToolButton>
      <ToolButton active={activeTool === "sticky"} label="Sticky note" shortcut="S" onClick={() => pick("sticky")}>
        <StickyNote className="size-[22px]" />
      </ToolButton>

      {/* Shapes flyout — button shows the active shape, opens upward. */}
      <div className="relative">
        <ToolButton
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
        </ToolButton>
        {shapesOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShapesOpen(false)} />
            <div className="animate-pop-up absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 gap-0.5 rounded-2xl border border-hairline bg-chrome p-1.5 shadow-toolbar">
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
                      className={`grid size-11 place-items-center rounded-xl transition-transform duration-100 active:scale-90 ${
                        activeTool === id ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      <Icon className="size-[20px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <ToolButton active={activeTool === "draw"} label="Pen" shortcut="P" onClick={() => pick("draw")}>
        <Pencil className="size-[22px]" />
      </ToolButton>

      <Sep />

      <ToolButton
        active={commentMode}
        label="Comment"
        shortcut="C"
        onClick={() => useUiStore.getState().setCommentMode(!commentMode)}
      >
        <MessageSquare className="size-[22px]" />
      </ToolButton>

      {/* Insert flyout — lists component kinds, opens upward, closes on outside click. */}
      <div className="relative">
        <ToolButton
          active={pendingInsert !== null}
          label="Insert"
          onClick={() => setInsertOpen((o) => !o)}
        >
          <SquarePlus className="size-[22px]" />
        </ToolButton>
        {insertOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setInsertOpen(false)} />
            <div className="animate-pop-up absolute bottom-full left-1/2 z-20 mb-2 flex w-52 -translate-x-1/2 flex-col gap-0.5 rounded-2xl border border-hairline bg-chrome p-2 shadow-toolbar">
              {componentList().map((def) => {
                const DefIcon = def.icon;
                return (
                  <button
                    key={String(def.kind)}
                    type="button"
                    aria-label={def.label}
                    onClick={() => {
                      useUiStore.getState().setPendingInsert(def.kind);
                      setInsertOpen(false);
                    }}
                    className={`flex h-12 w-full items-center gap-3 rounded-xl px-3.5 transition-transform duration-100 active:scale-[0.97] ${
                      pendingInsert === def.kind ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                    }`}
                  >
                    <DefIcon className="size-[22px] shrink-0" />
                    <span className="whitespace-nowrap text-[15px] font-medium">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
