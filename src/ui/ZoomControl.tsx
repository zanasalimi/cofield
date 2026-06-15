/**
 * Bottom-right zoom readout (Miro convention). Click to reset to 100%.
 */
"use client";

import { useUiStore } from "@/store/ui-store";

export function ZoomControl() {
  const zoom = useUiStore((s) => s.viewport.zoom);
  const setViewport = useUiStore((s) => s.setViewport);

  return (
    <button
      type="button"
      onClick={() => setViewport({ ...useUiStore.getState().viewport, zoom: 1 })}
      className="pointer-events-auto rounded-lg border border-hairline bg-chrome px-3 py-1.5 text-xs tabular-nums text-ink-soft shadow-toolbar transition-transform duration-100 hover:text-ink active:scale-95"
      aria-label="Reset zoom to 100%"
    >
      {Math.round(zoom * 100)}%
    </button>
  );
}
