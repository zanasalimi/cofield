/**
 * The overlay layers (connection points, rotate handle, comment pins) sit inside
 * the canvas surface, so a pointer event has to lose the surface's offset before
 * the viewport transform is applied. Getting that wrong is invisible until a
 * header pushes the surface down the page, at which point every drop lands one
 * header-height below the cursor and quietly misses the shape under it.
 */
import { describe, it, expect } from "vitest";
import { worldAtPointer } from "@/canvas/pointer";
import { useUiStore } from "@/store/ui-store";

/** Only getBoundingClientRect is read, so a stub is the whole surface we need. */
function surfaceAt(left: number, top: number): Element {
  return { getBoundingClientRect: () => ({ left, top }) } as unknown as Element;
}

describe("worldAtPointer", () => {
  it("subtracts the surface offset before applying the viewport", () => {
    useUiStore.setState({ viewport: { x: 0, y: 0, zoom: 1 } });
    expect(worldAtPointer(surfaceAt(0, 56), 145, 238)).toEqual({ x: 145, y: 182 });
  });

  it("accounts for pan and zoom", () => {
    useUiStore.setState({ viewport: { x: 100, y: 40, zoom: 2 } });
    expect(worldAtPointer(surfaceAt(20, 56), 220, 256)).toEqual({ x: 200, y: 140 });
  });

  it("falls back to the page origin when the surface is not mounted yet", () => {
    useUiStore.setState({ viewport: { x: 0, y: 0, zoom: 1 } });
    expect(worldAtPointer(null, 10, 20)).toEqual({ x: 10, y: 20 });
  });
});
