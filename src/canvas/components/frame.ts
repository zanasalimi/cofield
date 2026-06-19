import { Frame } from "lucide-react";
import type { ComponentDef } from "./registry";
import { roundRectPath } from "@/canvas/renderer/shapes-util";

export interface FrameProps {
  title: string;
  preset: "desktop" | "tablet" | "phone" | "slide" | "free";
  bg: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  shadow: "none" | "sm" | "md" | "lg";
}

const SHADOW: Record<FrameProps["shadow"], number> = { none: 0, sm: 6, md: 14, lg: 28 };

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
  defaults: () => ({
    props: { title: "Frame", preset: "free", bg: "#FFFFFF", borderColor: "#E7E5E0", borderWidth: 1, radius: 12, shadow: "sm" },
    w: 360,
    h: 260,
  }),
  customSchema: [
    { kind: "text", key: "title", label: "Title" },
    { kind: "select", key: "preset", label: "Preset", options: [
      { value: "free", label: "Free" }, { value: "desktop", label: "Desktop" },
      { value: "tablet", label: "Tablet" }, { value: "phone", label: "Phone" }, { value: "slide", label: "Slide" },
    ] },
    { kind: "color", key: "bg", label: "Background" },
    { kind: "color", key: "borderColor", label: "Border" },
    { kind: "slider", key: "borderWidth", label: "Border width", min: 0, max: 6, step: 1 },
    { kind: "slider", key: "radius", label: "Corner radius", min: 0, max: 48, step: 1 },
    { kind: "select", key: "shadow", label: "Shadow", options: [
      { value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" },
    ] },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as FrameProps;
    const bw = p.borderWidth ?? 1;
    ctx.save();
    const blur = SHADOW[p.shadow ?? "sm"] ?? 6;
    if (blur > 0) {
      ctx.shadowColor = "rgba(20,20,40,0.14)";
      ctx.shadowBlur = blur;
      ctx.shadowOffsetY = blur / 3;
    }
    ctx.fillStyle = p.bg ?? "#FFFFFF";
    roundRectPath(ctx, shape.x, shape.y, shape.w, shape.h, p.radius ?? 12);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (bw > 0) {
      ctx.strokeStyle = p.borderColor ?? "#E7E5E0";
      ctx.lineWidth = bw;
      ctx.stroke();
    }
    // title above the frame
    ctx.fillStyle = "#6B6B66";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(p.title ?? "Frame", shape.x + 2, shape.y - 6);
    ctx.restore();
  },
};
export { PRESET_SIZE };
