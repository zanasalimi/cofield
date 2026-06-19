import { describe, it, expect } from "vitest";
import "@/canvas/components";
import { getComponentDef } from "@/canvas/components/registry";

function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({}, { get: () => () => undefined }) as unknown as CanvasRenderingContext2D;
}

describe("component drawChrome", () => {
  for (const kind of ["frame", "table", "code"] as const) {
    it(`${kind} draws without throwing`, () => {
      const def = getComponentDef(kind);
      const { props, w, h } = def.defaults();
      const shape = { id: "x", type: "component", kind, x: 0, y: 0, w, h, rotation: 0, style: { fill: "transparent", stroke: "#000", strokeWidth: 1 }, props, createdBy: "u" } as never;
      expect(() => def.drawChrome(fakeCtx(), shape, { x: 0, y: 0, zoom: 1 })).not.toThrow();
    });
  }
});
