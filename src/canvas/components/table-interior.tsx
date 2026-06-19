// src/canvas/components/table-interior.tsx
"use client";
import type { Shape } from "@/collab/types";
import { useBoardStore } from "@/store/board-store";
import type { TableProps } from "./table";

export function TableInterior({ shape }: { shape: Shape }) {
  const p = shape.props as unknown as TableProps;
  const setCell = (r: number, c: number, v: string) => {
    const cells = p.cells.map((row) => row.slice());
    (cells[r] ??= [])[c] = v;
    useBoardStore.getState().updateComponentProps(shape.id, { cells });
  };
  return (
    <div
      className="grid size-full"
      style={{
        gridTemplateColumns: p.colW.map((w) => `${w}px`).join(" "),
        gridTemplateRows: p.rowH.map((h) => `${h}px`).join(" "),
      }}
    >
      {Array.from({ length: p.rows }).flatMap((_, r) =>
        Array.from({ length: p.cols }).map((__, c) => (
          <input
            key={`${r}-${c}`}
            value={p.cells[r]?.[c] ?? ""}
            onChange={(e) => setCell(r, c, e.target.value)}
            className="size-full border-none bg-transparent px-2 text-sm text-ink outline-none focus:bg-primary/5"
          />
        )),
      )}
    </div>
  );
}
