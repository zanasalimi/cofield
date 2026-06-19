import { describe, it, expect, beforeAll } from "vitest";
import { getComponentDef, applyCustomField, componentList } from "@/canvas/components/registry";
import "@/canvas/components"; // registers frame/table/code

describe("component registry", () => {
  beforeAll(() => void 0);

  it("lists the three Phase-1 kinds", () => {
    expect(componentList().map((d) => d.kind).sort()).toEqual(["code", "frame", "table"]);
  });

  it("frame defaults carry title/preset/bg/radius and a size", () => {
    const d = getComponentDef("frame").defaults();
    expect(d.props).toMatchObject({ preset: "free" });
    expect(d.w).toBeGreaterThan(0);
    expect(d.h).toBeGreaterThan(0);
  });

  it("table measure derives size from column widths and row heights", () => {
    const def = getComponentDef("table");
    const props = { rows: 2, cols: 2, colW: [80, 120], rowH: [40, 40], headerRow: true, cells: [["", ""], ["", ""]] };
    expect(def.measure!(props)).toEqual({ w: 200, h: 80 });
  });

  it("applyCustomField returns a new object with the key set", () => {
    const next = applyCustomField({ title: "A", radius: 8 }, "title", "B");
    expect(next).toEqual({ title: "B", radius: 8 });
  });

  it("throws on an unknown kind", () => {
    expect(() => getComponentDef("nope" as never)).toThrow();
  });
});
