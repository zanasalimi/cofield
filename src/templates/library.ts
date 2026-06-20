/**
 * Curated, professional starter templates. Each lays its nodes out in a local
 * coordinate space; the importer centres the bounding box on the drop point, so
 * only relative positions matter. Colours use the brand cursor hues with soft
 * tinted fills — readable, not the default flat-grey diagram look.
 */
import type { Template, TemplateNode, TemplateEdge } from "./types";
import type { Side, ShapeStyle } from "@/collab/types";

const P = {
  blue: { fill: "#EAF4FC", stroke: "#2D9CDB" },
  purple: { fill: "#EDECFC", stroke: "#5B5BD6" },
  green: { fill: "#E9F6EB", stroke: "#3FA34D" },
  amber: { fill: "#FFF3E0", stroke: "#E8870B" },
  coral: { fill: "#FDECEC", stroke: "#FF5C5C" },
  slate: { fill: "#F1F5F9", stroke: "#64748B" },
  teal: { fill: "#E4F6F4", stroke: "#1FB3A3" },
} as const;

type Hue = keyof typeof P;
type NodeType = TemplateNode["type"];

/** A labelled box (rect/ellipse/diamond/…) with centred type. */
function box(
  ref: string,
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  hue: Hue,
  type: NodeType = "rect",
  extra: Partial<ShapeStyle> = {},
): TemplateNode {
  return {
    ref,
    type,
    x,
    y,
    w,
    h,
    content,
    style: {
      fill: P[hue].fill,
      stroke: P[hue].stroke,
      strokeWidth: 2,
      textColor: "#15233B",
      fontSize: 14,
      align: "center",
      valign: "middle",
      ...extra,
    },
  };
}

/** A left/top-aligned block — used for UML class / ER bodies. */
function panel(ref: string, x: number, y: number, w: number, h: number, content: string, hue: Hue): TemplateNode {
  return box(ref, x, y, w, h, content, hue, "rect", { align: "left", valign: "top", fontSize: 13 });
}

function edge(from: string, to: string, fromSide?: Side, toSide?: Side, style: Partial<ShapeStyle> = {}): TemplateEdge {
  return { from, to, fromSide, toSide, style: { routing: "elbow", ...style } };
}

// ─── UI / UX ──────────────────────────────────────────────────────────────

const onboardingFlow: Template = {
  id: "user-onboarding",
  name: "User Onboarding Flow",
  description: "Sign-up to first-run, with email verification branch.",
  category: "uiux",
  nodes: [
    box("start", 60, 0, 160, 56, "Visitor lands", "green", "ellipse"),
    box("signup", 60, 110, 160, 64, "Create account", "blue"),
    box("verify", 60, 230, 160, 64, "Send verify email", "blue"),
    box("dec", 70, 360, 140, 96, "Email\nconfirmed?", "amber", "diamond"),
    box("resend", -160, 372, 150, 64, "Resend link", "coral"),
    box("welcome", 290, 372, 160, 64, "Welcome screen", "purple"),
    box("done", 290, 490, 160, 56, "Activated", "green", "ellipse"),
  ],
  edges: [
    edge("start", "signup", "bottom", "top"),
    edge("signup", "verify", "bottom", "top"),
    edge("verify", "dec", "bottom", "top"),
    edge("dec", "resend", "left", "right"),
    edge("dec", "welcome", "right", "left"),
    edge("resend", "verify", "top", "left", { strokeDash: "dashed" }),
    edge("welcome", "done", "bottom", "top"),
  ],
};

const mobileWireframe: Template = {
  id: "mobile-wireframe",
  name: "Mobile App Wireframe",
  description: "Phone frame with header, feed cards and tab bar.",
  category: "uiux",
  nodes: [
    { ref: "frame", type: "component", kind: "frame", x: 0, y: 0, w: 280, h: 560, props: { title: "Home", preset: "phone", bg: "#FFFFFF", borderColor: "#CBD5E1", borderWidth: 2, radius: 28, shadow: "md" } },
    box("status", 20, 44, 240, 28, "9:41        ▪ ▪ ▪", "slate", "rect", { align: "left", fontSize: 11, strokeWidth: 0, fill: "#F8FAFC" }),
    box("header", 20, 84, 240, 52, "Discover", "blue", "rect", { align: "left", fontSize: 18, bold: true }),
    box("search", 20, 148, 240, 40, "Search…", "slate", "rect", { align: "left", fontSize: 13 }),
    box("card1", 20, 204, 240, 96, "Featured", "purple"),
    box("card2", 20, 312, 116, 88, "Card", "teal"),
    box("card3", 144, 312, 116, 88, "Card", "amber"),
    box("card4", 20, 412, 240, 64, "List item", "slate"),
    box("tabbar", 20, 492, 240, 48, "⌂      ◎      ♡      ☰", "blue", "rect", { fontSize: 16 }),
  ],
};

const kanban: Template = {
  id: "kanban-board",
  name: "Kanban Board",
  description: "Three-column workflow with task cards.",
  category: "uiux",
  nodes: [
    box("todoCol", 0, 0, 220, 460, "", "slate", "rect", { fill: "#F1F5F9", strokeWidth: 0 }),
    box("doingCol", 250, 0, 220, 460, "", "slate", "rect", { fill: "#EFF6FF", strokeWidth: 0 }),
    box("doneCol", 500, 0, 220, 460, "", "slate", "rect", { fill: "#ECFDF3", strokeWidth: 0 }),
    box("todoH", 16, 16, 188, 40, "To Do", "slate", "rect", { bold: true, align: "left", strokeWidth: 0, fill: "transparent" }),
    box("doingH", 266, 16, 188, 40, "In Progress", "blue", "rect", { bold: true, align: "left", strokeWidth: 0, fill: "transparent" }),
    box("doneH", 516, 16, 188, 40, "Done", "green", "rect", { bold: true, align: "left", strokeWidth: 0, fill: "transparent" }),
    { ref: "t1", type: "sticky", x: 16, y: 72, w: 188, h: 88, content: "Design empty states", style: { fill: "#FFE3A3" } },
    { ref: "t2", type: "sticky", x: 16, y: 176, w: 188, h: 88, content: "Audit colour contrast", style: { fill: "#FFE3A3" } },
    { ref: "d1", type: "sticky", x: 266, y: 72, w: 188, h: 88, content: "Realtime cursor sync", style: { fill: "#BFE3FF" } },
    { ref: "n1", type: "sticky", x: 516, y: 72, w: 188, h: 88, content: "Set up CI pipeline", style: { fill: "#B8F0C6" } },
  ],
};

// ─── Flowchart ──────────────────────────────────────────────────────────────

const basicFlow: Template = {
  id: "basic-flowchart",
  name: "Process Flowchart",
  description: "Start, process, decision branch and end.",
  category: "flow",
  nodes: [
    box("start", 60, 0, 160, 56, "Start", "green", "ellipse"),
    box("input", 60, 112, 160, 64, "Receive request", "blue"),
    box("dec", 70, 232, 140, 100, "Input valid?", "amber", "diamond"),
    box("err", -190, 248, 160, 64, "Return error", "coral"),
    box("proc", 300, 248, 160, 64, "Process & store", "blue"),
    box("notify", 300, 360, 160, 64, "Notify user", "purple"),
    box("end", 130, 470, 160, 56, "End", "green", "ellipse"),
  ],
  edges: [
    edge("start", "input", "bottom", "top"),
    edge("input", "dec", "bottom", "top"),
    edge("dec", "err", "left", "right"),
    edge("dec", "proc", "right", "left"),
    edge("err", "input", "top", "left", { strokeDash: "dashed" }),
    edge("proc", "notify", "bottom", "top"),
    edge("notify", "end", "bottom", "top"),
  ],
};

const swimlane: Template = {
  id: "swimlane",
  name: "Swimlane Process",
  description: "Customer / System / Fulfilment lanes for an order.",
  category: "flow",
  nodes: [
    box("lane1", 0, 0, 760, 130, "", "slate", "rect", { fill: "#F8FAFC", strokeWidth: 1, stroke: "#E2E8F0" }),
    box("lane2", 0, 130, 760, 130, "", "slate", "rect", { fill: "#F1F5F9", strokeWidth: 1, stroke: "#E2E8F0" }),
    box("lane3", 0, 260, 760, 130, "", "slate", "rect", { fill: "#F8FAFC", strokeWidth: 1, stroke: "#E2E8F0" }),
    box("l1", 8, 8, 110, 114, "Customer", "blue", "rect", { fill: "transparent", strokeWidth: 0, bold: true }),
    box("l2", 8, 138, 110, 114, "System", "purple", "rect", { fill: "transparent", strokeWidth: 0, bold: true }),
    box("l3", 8, 268, 110, 114, "Fulfilment", "green", "rect", { fill: "transparent", strokeWidth: 0, bold: true }),
    box("a1", 150, 33, 150, 64, "Place order", "blue"),
    box("a2", 360, 163, 150, 64, "Charge card", "purple"),
    box("a3", 360, 33, 150, 64, "Confirm order", "blue"),
    box("a4", 570, 293, 150, 64, "Ship package", "green"),
  ],
  edges: [
    edge("a1", "a3", "right", "left"),
    edge("a3", "a2", "bottom", "top"),
    edge("a2", "a4", "right", "top"),
  ],
};

// ─── UML & ER ─────────────────────────────────────────────────────────────

const umlClass: Template = {
  id: "uml-class",
  name: "UML Class Diagram",
  description: "User / Order / Product classes with associations.",
  category: "uml",
  nodes: [
    box("userH", 0, 0, 200, 36, "User", "blue", "rect", { bold: true }),
    panel("userB", 0, 36, 200, 120, "- id: UUID\n- email: string\n- name: string\n———————\n+ login()\n+ logout()", "blue"),
    box("orderH", 320, 0, 200, 36, "Order", "purple", "rect", { bold: true }),
    panel("orderB", 320, 36, 200, 120, "- id: UUID\n- total: money\n- status: enum\n———————\n+ submit()\n+ cancel()", "purple"),
    box("prodH", 320, 230, 200, 36, "Product", "green", "rect", { bold: true }),
    panel("prodB", 320, 266, 200, 104, "- id: UUID\n- title: string\n- price: money\n———————\n+ inStock()", "green"),
  ],
  edges: [
    edge("userB", "orderB", "right", "left", { startArrow: "diamond", endArrow: "none", routing: "straight" }),
    edge("orderB", "prodB", "bottom", "top", { endArrow: "open", routing: "straight" }),
  ],
};

const erDiagram: Template = {
  id: "er-diagram",
  name: "ER Diagram",
  description: "Relational tables with foreign-key relationships.",
  category: "uml",
  nodes: [
    { ref: "users", type: "component", kind: "table", x: 0, y: 0, w: 220, h: 160, props: { rows: 4, cols: 2, colW: [120, 100], rowH: [40, 40, 40, 40], headerRow: true, headerCol: false, banded: true, borderColor: "#2D9CDB", borderWidth: 1, cells: [["users", ""], ["id", "PK"], ["email", "uniq"], ["name", ""]] } },
    { ref: "orders", type: "component", kind: "table", x: 360, y: 0, w: 240, h: 200, props: { rows: 5, cols: 2, colW: [130, 110], rowH: [40, 40, 40, 40, 40], headerRow: true, headerCol: false, banded: true, borderColor: "#5B5BD6", borderWidth: 1, cells: [["orders", ""], ["id", "PK"], ["user_id", "FK"], ["total", ""], ["status", ""]] } },
    { ref: "items", type: "component", kind: "table", x: 360, y: 280, w: 240, h: 160, props: { rows: 4, cols: 2, colW: [130, 110], rowH: [40, 40, 40, 40], headerRow: true, headerCol: false, banded: true, borderColor: "#3FA34D", borderWidth: 1, cells: [["order_items", ""], ["id", "PK"], ["order_id", "FK"], ["product_id", "FK"]] } },
  ],
  edges: [
    edge("users", "orders", "right", "left", { endArrow: "circle", routing: "elbow" }),
    edge("orders", "items", "bottom", "top", { endArrow: "circle", routing: "elbow" }),
  ],
};

// ─── Cloud & System ─────────────────────────────────────────────────────────

const awsArch: Template = {
  id: "aws-web",
  name: "Cloud Web Architecture",
  description: "CDN, load balancer, app tier, cache and database.",
  category: "cloud",
  nodes: [
    box("client", 0, 60, 150, 64, "Client", "slate", "rect", { bold: true }),
    box("cdn", 210, 60, 150, 64, "CDN / Edge", "blue"),
    box("alb", 420, 60, 150, 64, "Load balancer", "blue"),
    box("app1", 630, 0, 150, 60, "App server", "purple"),
    box("app2", 630, 88, 150, 60, "App server", "purple"),
    box("cache", 840, -10, 150, 60, "Redis cache", "coral"),
    box("db", 840, 100, 150, 64, "Database", "green"),
  ],
  edges: [
    edge("client", "cdn", "right", "left"),
    edge("cdn", "alb", "right", "left"),
    edge("alb", "app1", "right", "left"),
    edge("alb", "app2", "right", "left"),
    edge("app1", "cache", "right", "left", { strokeDash: "dashed" }),
    edge("app1", "db", "right", "left"),
    edge("app2", "db", "right", "left"),
  ],
};

const microservices: Template = {
  id: "microservices",
  name: "Microservices Map",
  description: "API gateway fanning out to bounded services.",
  category: "cloud",
  nodes: [
    box("client", 0, 140, 150, 64, "Web / Mobile", "slate", "rect", { bold: true }),
    box("gw", 220, 140, 150, 64, "API Gateway", "blue", "rect", { bold: true }),
    box("auth", 440, 0, 160, 60, "Auth service", "purple"),
    box("orders", 440, 90, 160, 60, "Orders service", "purple"),
    box("billing", 440, 180, 160, 60, "Billing service", "purple"),
    box("search", 440, 270, 160, 60, "Search service", "purple"),
    box("queue", 670, 135, 150, 64, "Event bus", "amber"),
    box("db", 670, 240, 150, 64, "Data store", "green"),
  ],
  edges: [
    edge("client", "gw", "right", "left"),
    edge("gw", "auth", "right", "left"),
    edge("gw", "orders", "right", "left"),
    edge("gw", "billing", "right", "left"),
    edge("gw", "search", "right", "left"),
    edge("orders", "queue", "right", "left", { strokeDash: "dashed" }),
    edge("billing", "queue", "right", "left", { strokeDash: "dashed" }),
    edge("orders", "db", "bottom", "left"),
  ],
};

export const TEMPLATES: Template[] = [
  onboardingFlow,
  mobileWireframe,
  kanban,
  basicFlow,
  swimlane,
  umlClass,
  erDiagram,
  awsArch,
  microservices,
];
