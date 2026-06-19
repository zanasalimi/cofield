import { describe, it, expect } from "vitest";
import { tableDef, type TableProps } from "@/canvas/components/table";
import "@/canvas/components"; // registers all component kinds

// Use the typed tableDef directly so reconcile preserves full TableProps types.
// The typed def is narrower than ComponentDef<Record<string,unknown>>, but the
// implementation is identical — this just avoids type-erased casts.
const defaults = tableDef.defaults().props;

describe("table reconcile", () => {
  it("exposes a reconcile method", () => {
    expect(typeof tableDef.reconcile).toBe("function");
  });

  it("expanding cols rebuilds colW and cells column count", () => {
    const result = tableDef.reconcile!(defaults, { cols: 5 });
    expect(result.cols).toBe(5);
    expect(result.colW).toHaveLength(5);
    expect(result.cells[0]).toHaveLength(5);
  });

  it("preserves existing cell text in overlapping cells", () => {
    const withText: TableProps = {
      ...defaults,
      cells: [["Hello", "World", "!"], ["a", "b", "c"], ["d", "e", "f"]],
    };
    const result = tableDef.reconcile!(withText, { cols: 5 });
    // First three columns of each row should carry their original text.
    expect(result.cells[0]![0]).toBe("Hello");
    expect(result.cells[0]![1]).toBe("World");
    expect(result.cells[0]![2]).toBe("!");
    // New columns get empty strings.
    expect(result.cells[0]![3]).toBe("");
    expect(result.cells[0]![4]).toBe("");
  });

  it("shrinking cols truncates colW and cells", () => {
    const result = tableDef.reconcile!(defaults, { cols: 1 });
    expect(result.colW).toHaveLength(1);
    expect(result.cells[0]).toHaveLength(1);
  });

  it("expanding rows rebuilds rowH and cells row count", () => {
    const result = tableDef.reconcile!(defaults, { rows: 6 });
    expect(result.rows).toBe(6);
    expect(result.rowH).toHaveLength(6);
    expect(result.cells).toHaveLength(6);
  });

  it("clamps rows to [1, 30] and cols to [1, 12]", () => {
    const big = tableDef.reconcile!(defaults, { rows: 999, cols: 999 });
    expect(big.rows).toBe(30);
    expect(big.cols).toBe(12);
    const small = tableDef.reconcile!(defaults, { rows: -5, cols: 0 });
    expect(small.rows).toBe(1);
    expect(small.cols).toBe(1);
  });

  it("measure(reconciled) width grows when cols expand", () => {
    const r3 = tableDef.reconcile!(defaults, { cols: 3 });
    const r5 = tableDef.reconcile!(defaults, { cols: 5 });
    expect(tableDef.measure!(r5).w).toBeGreaterThan(tableDef.measure!(r3).w);
  });

  it("preserves existing colW for unchanged columns", () => {
    const wide: TableProps = { ...defaults, colW: [200, 80, 80] };
    const result = tableDef.reconcile!(wide, { cols: 4 });
    // First three columns keep their custom widths.
    expect(result.colW[0]).toBe(200);
    expect(result.colW[1]).toBe(80);
    expect(result.colW[2]).toBe(80);
    // Fourth column gets the default COL width (120).
    expect(result.colW[3]).toBe(120);
  });
});
