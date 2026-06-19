import { describe, it, expect, beforeEach } from "vitest";
import { useBoardStore } from "@/store/board-store";
import "@/canvas/components";

describe("board-store components", () => {
  beforeEach(() => useBoardStore.setState({ shapes: [] } as never));

  it("addComponent creates a component shape with registry defaults", () => {
    const id = useBoardStore.getState().addComponent("table", { x: 100, y: 80 });
    const s = useBoardStore.getState().getShape(id)!;
    expect(s.type).toBe("component");
    expect(s.kind).toBe("table");
    expect(s.props).toMatchObject({ rows: 3, cols: 3, headerRow: true });
    expect(s.x).toBe(100);
    expect(s.w).toBeGreaterThan(0);
  });

  it("updateComponentProps patches props locally when unbound", () => {
    const id = useBoardStore.getState().addComponent("frame", { x: 0, y: 0 });
    useBoardStore.getState().updateComponentProps(id, { title: "Login" });
    expect(useBoardStore.getState().getShape(id)!.props!.title).toBe("Login");
  });
});
