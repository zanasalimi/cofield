import { Code as Code2 } from "@phosphor-icons/react";
import type { ComponentDef } from "./registry";
import { roundRectPath } from "@/canvas/renderer/shapes-util";
import { CodeInterior } from "./code-interior";

export interface CodeProps {
  language: string;
  code: string;
  theme: "dark" | "light";
  lineNumbers: boolean;
  wrap: boolean;
  fontSize: number;
  title: string;
}

const PAD = 12, LINE = 18;

export const codeDef: ComponentDef<CodeProps> = {
  kind: "code",
  label: "Code block",
  icon: Code2,
  group: "structural",
  Interior: CodeInterior,
  defaults: () => ({
    props: { language: "ts", code: "// code", theme: "dark", lineNumbers: true, wrap: false, fontSize: 13, title: "" },
    w: 360, h: 120,
  }),
  customSchema: [
    { kind: "select", key: "language", label: "Language", options: [
      { value: "ts", label: "TypeScript" }, { value: "js", label: "JavaScript" },
      { value: "py", label: "Python" }, { value: "json", label: "JSON" }, { value: "bash", label: "Shell" }, { value: "css", label: "CSS" }, { value: "html", label: "HTML" },
    ] },
    { kind: "select", key: "theme", label: "Theme", options: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }] },
    { kind: "toggle", key: "lineNumbers", label: "Line numbers" },
    { kind: "toggle", key: "wrap", label: "Wrap lines" },
    { kind: "slider", key: "fontSize", label: "Font size", min: 9, max: 24, step: 1 },
    { kind: "text", key: "title", label: "Filename" },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as CodeProps;
    const dark = p.theme !== "light";
    const bg = dark ? "#0B0B22" : "#F7F7FB";
    const fg = dark ? "#E6E6F0" : "#1A1A1A";
    const gutter = dark ? "#5B5B8A" : "#9A9AB0";
    ctx.save();
    ctx.fillStyle = bg;
    roundRectPath(ctx, shape.x, shape.y, shape.w, shape.h, 10);
    ctx.fill();
    ctx.translate(shape.x, shape.y);
    ctx.font = `${p.fontSize ?? 13}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textBaseline = "top";
    const gx = p.lineNumbers ? 34 : PAD;
    const lines = (p.code ?? "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const y = PAD + i * LINE;
      if (y + LINE > shape.h) break;
      if (p.lineNumbers) { ctx.fillStyle = gutter; ctx.fillText(String(i + 1), PAD, y); }
      ctx.fillStyle = fg;
      ctx.fillText(lines[i] ?? "", gx, y, shape.w - gx - PAD);
    }
    ctx.restore();
  },
};
