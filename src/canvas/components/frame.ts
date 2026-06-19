import { Frame } from "lucide-react";
import type { ComponentDef } from "./registry";
import { roundRectPath } from "@/canvas/renderer/shapes-util";

export interface FrameProps {
  title: string;
  preset: "desktop" | "tablet" | "phone" | "slide" | "free";
  bg: string;
  radius: number;
}

const PRESET_SIZE: Record<FrameProps["preset"], { w: number; h: number }> = {
  desktop: { w: 1440, h: 1024 },
  tablet: { w: 834, h: 1112 },
  phone: { w: 390, h: 844 },
  slide: { w: 960, h: 540 },
  free: { w: 360, h: 260 },
};

export const frameDef: ComponentDef<FrameProps> = {
  kind: "frame",
  label: "Frame",
  icon: Frame,
  group: "structural",
  defaults: () => ({ props: { title: "Frame", preset: "free", bg: "#FFFFFF", radius: 12 }, w: 360, h: 260 }),
  customSchema: [
    { kind: "text", key: "title", label: "Title" },
    { kind: "select", key: "preset", label: "Preset", options: [
      { value: "free", label: "Free" }, { value: "desktop", label: "Desktop" },
      { value: "tablet", label: "Tablet" }, { value: "phone", label: "Phone" }, { value: "slide", label: "Slide" },
    ] },
    { kind: "color", key: "bg", label: "Background" },
    { kind: "number", key: "radius", label: "Radius", min: 0, max: 48, step: 1 },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as FrameProps;
    ctx.save();
    ctx.fillStyle = p.bg ?? "#FFFFFF";
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = shape.style.strokeWidth || 1;
    roundRectPath(ctx, shape.x, shape.y, shape.w, shape.h, p.radius ?? 12);
    ctx.fill();
    ctx.stroke();
    // title above the frame
    ctx.fillStyle = "#6B6B66";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(p.title ?? "Frame", shape.x + 2, shape.y - 6);
    ctx.restore();
  },
};
export { PRESET_SIZE };
