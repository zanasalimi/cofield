/**
 * The floating toolbar — the signature chrome. Floats over the canvas with
 * layered depth (shadow-toolbar), NOT glassmorphism. Holds the tool buttons,
 * the zoom readout, and the share/presence affordances.
 */
"use client";

import { cn } from "./cn";
import { useUiStore } from "@/store/ui-store";
import { TOOL_SHORTCUTS } from "@/canvas/tools";

export function Toolbar() {
  const activeTool = useUiStore((s) => s.activeTool);
  const setActiveTool = useUiStore((s) => s.setActiveTool);

  // TODO(M2): render tool buttons from TOOL_SHORTCUTS with Tooltip + active state.
  void activeTool;
  void setActiveTool;
  void TOOL_SHORTCUTS;

  return (
    <div
      role="toolbar"
      aria-label="Canvas tools"
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-xl border border-hairline",
        "bg-chrome px-2 py-1.5 shadow-toolbar",
      )}
    >
      {/* TODO(M2): tool buttons, divider, zoom readout */}
    </div>
  );
}
