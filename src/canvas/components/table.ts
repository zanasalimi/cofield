import { Table } from "lucide-react";
import type { ComponentDef } from "./registry";
import { TableInterior } from "./table-interior";

export interface TableProps {
  rows: number;
  cols: number;
  colW: number[];
  rowH: number[];
  headerRow: boolean;
  cells: string[][];
}

function blankCells(rows: number, cols: number, prev?: string[][]): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => prev?.[r]?.[c] ?? ""));
}

const COL = 120, ROW = 40;

export const tableDef: ComponentDef<TableProps> = {
  kind: "table",
  label: "Table",
  icon: Table,
  group: "structural",
  Interior: TableInterior,
  defaults: () => {
    const rows = 3, cols = 3;
    return {
      props: { rows, cols, colW: Array(cols).fill(COL), rowH: Array(rows).fill(ROW), headerRow: true, cells: blankCells(rows, cols) },
      w: cols * COL, h: rows * ROW,
    };
  },
  measure: (p) => ({ w: p.colW.reduce((a, b) => a + b, 0), h: p.rowH.reduce((a, b) => a + b, 0) }),
  reconcile(props, patch) {
    const merged = { ...props, ...patch };
    const rows = Math.max(1, Math.min(30, Math.round(merged.rows)));
    const cols = Math.max(1, Math.min(12, Math.round(merged.cols)));
    const colW = Array.from({ length: cols }, (_, c) => props.colW[c] ?? COL);
    const rowH = Array.from({ length: rows }, (_, r) => props.rowH[r] ?? ROW);
    const cells = blankCells(rows, cols, props.cells);
    return { ...merged, rows, cols, colW, rowH, cells };
  },
  customSchema: [
    { kind: "number", key: "rows", label: "Rows", min: 1, max: 30, step: 1 },
    { kind: "number", key: "cols", label: "Columns", min: 1, max: 12, step: 1 },
    { kind: "toggle", key: "headerRow", label: "Header row" },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as TableProps;
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, shape.w, shape.h);
    if (p.headerRow && p.rowH[0]) {
      ctx.fillStyle = "#F4F4F6";
      ctx.fillRect(0, 0, shape.w, p.rowH[0]);
    }
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = 1;
    let y = 0;
    for (const h of p.rowH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(shape.w, y); ctx.stroke(); y += h; }
    ctx.beginPath(); ctx.moveTo(0, shape.h); ctx.lineTo(shape.w, shape.h); ctx.stroke();
    let x = 0;
    for (const w of p.colW) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, shape.h); ctx.stroke(); x += w; }
    ctx.beginPath(); ctx.moveTo(shape.w, 0); ctx.lineTo(shape.w, shape.h); ctx.stroke();
    // cell text snapshot
    ctx.fillStyle = "#1A1A1A";
    ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    let cy = 0;
    for (let r = 0; r < p.rows; r++) {
      let cx = 0;
      for (let c = 0; c < p.cols; c++) {
        const text = p.cells[r]?.[c] ?? "";
        if (text) ctx.fillText(text, cx + 8, cy + (p.rowH[r] ?? ROW) / 2, (p.colW[c] ?? COL) - 12);
        cx += p.colW[c] ?? COL;
      }
      cy += p.rowH[r] ?? ROW;
    }
    ctx.restore();
  },
};

export { blankCells };
