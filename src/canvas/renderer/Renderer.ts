/**
 * The Renderer interface. Canvas2DRenderer implements it now; a WebGLRenderer
 * implements the same interface later for 10k+ shapes (ADR-004). Tools and
 * geometry never depend on a concrete renderer.
 */
import type { Point, Rect, Shape } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";
import type { SnapGuide } from "@/canvas/geometry/snapping";

export interface RenderScene {
  /** Shapes already culled to the viewport, in z-order. */
  shapes: Shape[];
  /** Current viewport transform. */
  viewport: Viewport;
  /** Selected shape ids (local). */
  selection: string[];
  /** Shape the pointer hovers — shows connection dots so a relation can start without selecting. */
  hovered?: string | null;
  /** A connector being dragged from a connection dot to the pointer (world coords). */
  connecting?: { from: Point; to: Point } | null;
  /** Shape under the pointer while dragging a connector — highlighted as the drop target. */
  dropTarget?: string | null;
  /** In-progress marquee selection rectangle (world coords), or null. */
  marquee?: Rect | null;
  /** Alignment guide lines shown while dragging (world coords). */
  guides?: SnapGuide[];
}

export interface Renderer {
  /** Attach to a canvas element and size the backing store to DPR. */
  mount(canvas: HTMLCanvasElement): void;
  /** Resize the backing store (e.g. on container resize / DPR change). */
  resize(width: number, height: number, dpr: number): void;
  /** Paint a frame. May repaint a dirty sub-rect for small changes. */
  render(scene: RenderScene): void;
  /** Release GPU/2D resources. */
  destroy(): void;
}
