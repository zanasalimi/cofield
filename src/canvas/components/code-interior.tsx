// src/canvas/components/code-interior.tsx
"use client";
import type { Shape } from "@/collab/types";
import { useBoardStore } from "@/store/board-store";
import type { CodeProps } from "./code";

export function CodeInterior({ shape }: { shape: Shape }) {
  const p = shape.props as unknown as CodeProps;
  const dark = p.theme !== "light";
  return (
    <textarea
      value={p.code ?? ""}
      onChange={(e) =>
        useBoardStore.getState().updateComponentProps(shape.id, { code: e.target.value })
      }
      spellCheck={false}
      wrap={p.wrap ? "soft" : "off"}
      className="size-full resize-none rounded-[10px] border-none p-3 outline-none"
      style={{
        background: "transparent",
        color: dark ? "#E6E6F0" : "#1A1A1A",
        font: `${p.fontSize ?? 13}px ui-monospace, monospace`,
        paddingLeft: p.lineNumbers ? 34 : 12,
        whiteSpace: p.wrap ? "pre-wrap" : "pre",
        overflowX: p.wrap ? "hidden" : "auto",
      }}
    />
  );
}
