# Hugeicons Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@phosphor-icons/react` with `@hugeicons/react` + `@hugeicons/core-free-icons` across the entire Cofield codebase without changing any JSX usage sites.

**Architecture:** A single central wrapper module `src/components/icons.tsx` re-exports every Phosphor local name as a `React.FC<{ className?: string; strokeWidth?: number }>` built around `HugeiconsIcon`. All 19 import sites are updated to pull from `@/components/icons` instead of `@phosphor-icons/react`. The Phosphor `IconContext` provider is deleted and unwrapped from `app/layout.tsx`. The `Icon` type in `registry.ts` becomes a plain React FC type so it's no longer coupled to Phosphor.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, `@hugeicons/react` (HugeiconsIcon wrapper), `@hugeicons/core-free-icons` (stroke icon data), pnpm

## Global Constraints

- Typecheck MUST pass: `pnpm typecheck`
- Lint MUST be clean: `pnpm lint`
- `grep -rl "@phosphor-icons/react" src app` must return empty after completion
- Do NOT run dev server or Playwright
- Do NOT commit
- PATH prefix required for pnpm: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH"`
- All icon wrappers use stroke/outline style only (core-free-icons are all stroke)
- `HugeiconsIcon` forwards `className` for Tailwind sizing

---

## Complete Local-Name → Hugeicons Mapping

All phosphor local names used across the codebase and their Hugeicons mapping:

| Local name | Hugeicons icon | Notes |
|---|---|---|
| `MousePointer2` | `Cursor02Icon` | |
| `Hand` | `HandGrabIcon` | |
| `Type` | `CursorTextIcon` | text insertion cursor |
| `StickyNote` | `StickyNote01Icon` | |
| `Square` | `Square01Icon` | |
| `Circle` | `CircleIcon` | |
| `Triangle` | `Triangle01Icon` | |
| `Diamond` | `DiamondIcon` | |
| `Star` | `StarIcon` | |
| `MoveUpRight` | `ArrowMoveUpRightIcon` | |
| `Pencil` | `PencilEdit01Icon` | used as tool in Toolbar |
| `Pen` | `PencilEdit01Icon` | alias in PenToolbar |
| `Shapes` | `GeometricShapes01Icon` | |
| `MessageSquare` | `Comment01Icon` | |
| `SquarePlus` | `PlusSignSquareIcon` | |
| `HelpCircle` | `HelpCircleIcon` | |
| `ChevronDown` | `ChevronDownIcon` | native Hugeicons chevron |
| `ChevronUp` | `ChevronUpIcon` | |
| `ChevronRight` | `ChevronRightIcon` | |
| `Maximize` | `ArrowExpand01Icon` | expand/fullscreen |
| `Highlighter` | `HighlighterIcon` | |
| `Eraser` | `Eraser01Icon` | |
| `Undo2` | `Undo02Icon` | |
| `Redo2` | `Redo02Icon` | |
| `Minus` | `MinusSignIcon` | |
| `Plus` | `PlusSignIcon` | |
| `Check` | `CheckmarkCircle01Icon` | checkmark |
| `Send` | `MailSend01Icon` | paper-send style |
| `Trash2` | `Delete02Icon` | |
| `X` | `Cancel01Icon` | close/dismiss |
| `XIcon` | `Cancel01Icon` | alias for dialog |
| `Smile` | `SmileIcon` | |
| `MoreHorizontal` | `MoreHorizontalIcon` | |
| `ArrowUp` | `ArrowUp01Icon` | |
| `ArrowDown` | `ArrowDown01Icon` | |
| `ArrowLeft` | `ArrowLeft01Icon` | |
| `ArrowRight` | `ArrowRight01Icon` | |
| `Copy` | `Copy01Icon` | |
| `Lock` | `SquareLock01Icon` | |
| `Unlock` | `SquareUnlock01Icon` | |
| `Code2` | `SourceCodeIcon` | |
| `Pipette` | `ColorPickerIcon` | |
| `Frame` | `FrameIcon` | |
| `Link2` | `Link01Icon` | |
| `Table` | `Table01Icon` | |
| `RotateCw` | `RotateClockwiseIcon` | |
| `Workflow` | `WorkflowSquare01Icon` | |
| `LayoutGrid` | `LayoutGridIcon` | |
| `Search` | `Search01Icon` | |
| `Settings` | `Settings01Icon` | |
| `Download` | `Download01Icon` | |
| `Home` | `Home01Icon` | |
| `AlignStartVertical` | `AlignStartVerticalIcon` | left-align objects |
| `AlignCenterVertical` | `AlignVerticalCenterIcon` | center-align objects vertically |
| `AlignEndVertical` | `AlignEndVerticalIcon` | right-align objects |
| `AlignStartHorizontal` | `AlignStartHorizontalIcon` | top-align objects |
| `AlignCenterHorizontal` | `AlignHorizontalCenterIcon` | center-align objects horizontally |
| `AlignEndHorizontal` | `AlignEndHorizontalIcon` | bottom-align objects |
| `AlignHorizontalDistributeCenter` | `AlignHorizontalDistributeCenterIcon` | |
| `AlignVerticalDistributeCenter` | `AlignVerticalDistributeCenterIcon` | |
| `Bold` | `TextBoldIcon` | |
| `Italic` | `TextItalicIcon` | |
| `Underline` | `TextUnderlineIcon` | |
| `Strikethrough` | `TextStrikethroughIcon` | |
| `AlignLeft` | `TextAlignLeftIcon` | text align (NOT object align) |
| `AlignCenter` | `TextAlignCenterIcon` | text align |
| `AlignRight` | `TextAlignRightIcon` | text align |
| `Droplets` | `DropletsIcon` | |
| `Scaling` | `Resize01Icon` | resize/scale |
| `MessageSquarePlus` | `CommentAdd01Icon` | |
| `Spline` | `SplinePointerIcon` | |
| `CornerDownRight` | `CornerDownRightIcon` | |
| `ArrowRightLeft` | `ArrowDataTransferHorizontalIcon` | swap/transfer horizontal |

**Substitution notes:**
- `AlignCenterVertical` → `AlignVerticalCenterIcon` (not `AlignCenterVerticalIcon` which doesn't exist)
- `ArrowRightLeft` → `ArrowDataTransferHorizontalIcon` (no direct `ArrowRightLeftIcon`; `ArrowLeftRightIcon` also exists but data-transfer reads better for the connector swap use)
- `Check` → `CheckmarkCircle01Icon` (simple check indicator, used in comment threading)
- `Pen` and `Pencil` both map to `PencilEdit01Icon` (same underlying icon, different Phosphor local names)
- `X` / `XIcon` both map to `Cancel01Icon`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/icons.tsx` | **Create** | Central wrapper: one named export per local Phosphor name |
| `src/components/IconProvider.tsx` | **Delete** | Phosphor-only; no Hugeicons equivalent needed |
| `src/canvas/components/registry.ts` | **Modify** | Replace `import type { Icon } from "@phosphor-icons/react"` with local FC type |
| `app/layout.tsx` | **Modify** | Remove `IconProvider` import + wrapper |
| `src/canvas/components/code.ts` | **Modify** | Swap import |
| `src/canvas/components/frame.ts` | **Modify** | Swap import |
| `src/canvas/components/table.ts` | **Modify** | Swap import |
| `src/canvas/AlignBar.tsx` | **Modify** | Swap import |
| `src/canvas/CommentsLayer.tsx` | **Modify** | Swap import |
| `src/canvas/ContextMenu.tsx` | **Modify** | Swap import |
| `src/canvas/HoverConnectLayer.tsx` | **Modify** | Swap import |
| `src/canvas/Inspector.tsx` | **Modify** | Swap import |
| `src/canvas/LinkLayer.tsx` | **Modify** | Swap import |
| `src/canvas/RotateHandle.tsx` | **Modify** | Swap import |
| `src/canvas/SelectionToolbar.tsx` | **Modify** | Swap import |
| `src/components/ui/dialog.tsx` | **Modify** | Swap import |
| `src/ui/HelpButton.tsx` | **Modify** | Swap import |
| `src/ui/Minimap.tsx` | **Modify** | Swap import |
| `src/ui/PenToolbar.tsx` | **Modify** | Swap import |
| `src/ui/Toolbar.tsx` | **Modify** | Swap import |
| `src/ui/TopBar.tsx` | **Modify** | Swap import |
| `src/ui/ZoomControl.tsx` | **Modify** | Swap import |

---

## Task 1: Create `src/components/icons.tsx`

**Files:**
- Create: `src/components/icons.tsx`

**Interfaces:**
- Produces: One named `React.FC<IconProps>` export per local name in the mapping table above. `IconProps = { className?: string; strokeWidth?: number }`.

- [ ] **Step 1: Create the file**

```tsx
// src/components/icons.tsx
"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cursor02Icon,
  HandGrabIcon,
  CursorTextIcon,
  StickyNote01Icon,
  Square01Icon,
  CircleIcon,
  Triangle01Icon,
  DiamondIcon,
  StarIcon,
  ArrowMoveUpRightIcon,
  PencilEdit01Icon,
  GeometricShapes01Icon,
  Comment01Icon,
  PlusSignSquareIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  ArrowExpand01Icon,
  HighlighterIcon,
  Eraser01Icon,
  Undo02Icon,
  Redo02Icon,
  MinusSignIcon,
  PlusSignIcon,
  CheckmarkCircle01Icon,
  MailSend01Icon,
  Delete02Icon,
  Cancel01Icon,
  SmileIcon,
  MoreHorizontalIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  SourceCodeIcon,
  ColorPickerIcon,
  FrameIcon,
  Link01Icon,
  Table01Icon,
  RotateClockwiseIcon,
  WorkflowSquare01Icon,
  LayoutGridIcon,
  Search01Icon,
  Settings01Icon,
  Download01Icon,
  Home01Icon,
  AlignStartVerticalIcon,
  AlignVerticalCenterIcon,
  AlignEndVerticalIcon,
  AlignStartHorizontalIcon,
  AlignHorizontalCenterIcon,
  AlignEndHorizontalIcon,
  AlignHorizontalDistributeCenterIcon,
  AlignVerticalDistributeCenterIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextStrikethroughIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  DropletsIcon,
  Resize01Icon,
  CommentAdd01Icon,
  SplinePointerIcon,
  CornerDownRightIcon,
  ArrowDataTransferHorizontalIcon,
} from "@hugeicons/core-free-icons";

type IconProps = { className?: string; strokeWidth?: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- core-free-icons exports untyped icon data objects; HugeiconsIcon validates at runtime
const make = (icon: any) => (props: IconProps) => <HugeiconsIcon icon={icon} {...props} />;

export const MousePointer2 = make(Cursor02Icon);
export const Hand = make(HandGrabIcon);
export const Type = make(CursorTextIcon);
export const StickyNote = make(StickyNote01Icon);
export const Square = make(Square01Icon);
export const Circle = make(CircleIcon);
export const Triangle = make(Triangle01Icon);
export const Diamond = make(DiamondIcon);
export const Star = make(StarIcon);
export const MoveUpRight = make(ArrowMoveUpRightIcon);
export const Pencil = make(PencilEdit01Icon);
export const Pen = make(PencilEdit01Icon);
export const Shapes = make(GeometricShapes01Icon);
export const MessageSquare = make(Comment01Icon);
export const SquarePlus = make(PlusSignSquareIcon);
export const HelpCircle = make(HelpCircleIcon);
export const ChevronDown = make(ChevronDownIcon);
export const ChevronUp = make(ChevronUpIcon);
export const ChevronRight = make(ChevronRightIcon);
export const Maximize = make(ArrowExpand01Icon);
export const Highlighter = make(HighlighterIcon);
export const Eraser = make(Eraser01Icon);
export const Undo2 = make(Undo02Icon);
export const Redo2 = make(Redo02Icon);
export const Minus = make(MinusSignIcon);
export const Plus = make(PlusSignIcon);
export const Check = make(CheckmarkCircle01Icon);
export const Send = make(MailSend01Icon);
export const Trash2 = make(Delete02Icon);
export const X = make(Cancel01Icon);
export const XIcon = make(Cancel01Icon);
export const Smile = make(SmileIcon);
export const MoreHorizontal = make(MoreHorizontalIcon);
export const ArrowUp = make(ArrowUp01Icon);
export const ArrowDown = make(ArrowDown01Icon);
export const ArrowLeft = make(ArrowLeft01Icon);
export const ArrowRight = make(ArrowRight01Icon);
export const Copy = make(Copy01Icon);
export const Lock = make(SquareLock01Icon);
export const Unlock = make(SquareUnlock01Icon);
export const Code2 = make(SourceCodeIcon);
export const Pipette = make(ColorPickerIcon);
export const Frame = make(FrameIcon);
export const Link2 = make(Link01Icon);
export const Table = make(Table01Icon);
export const RotateCw = make(RotateClockwiseIcon);
export const Workflow = make(WorkflowSquare01Icon);
export const LayoutGrid = make(LayoutGridIcon);
export const Search = make(Search01Icon);
export const Settings = make(Settings01Icon);
export const Download = make(Download01Icon);
export const Home = make(Home01Icon);
export const AlignStartVertical = make(AlignStartVerticalIcon);
export const AlignCenterVertical = make(AlignVerticalCenterIcon);
export const AlignEndVertical = make(AlignEndVerticalIcon);
export const AlignStartHorizontal = make(AlignStartHorizontalIcon);
export const AlignCenterHorizontal = make(AlignHorizontalCenterIcon);
export const AlignEndHorizontal = make(AlignEndHorizontalIcon);
export const AlignHorizontalDistributeCenter = make(AlignHorizontalDistributeCenterIcon);
export const AlignVerticalDistributeCenter = make(AlignVerticalDistributeCenterIcon);
export const Bold = make(TextBoldIcon);
export const Italic = make(TextItalicIcon);
export const Underline = make(TextUnderlineIcon);
export const Strikethrough = make(TextStrikethroughIcon);
export const AlignLeft = make(TextAlignLeftIcon);
export const AlignCenter = make(TextAlignCenterIcon);
export const AlignRight = make(TextAlignRightIcon);
export const Droplets = make(DropletsIcon);
export const Scaling = make(Resize01Icon);
export const MessageSquarePlus = make(CommentAdd01Icon);
export const Spline = make(SplinePointerIcon);
export const CornerDownRight = make(CornerDownRightIcon);
export const ArrowRightLeft = make(ArrowDataTransferHorizontalIcon);
```

- [ ] **Step 2: Verify the file was written correctly**

Run: `grep -c "export const" src/components/icons.tsx`

Expected: output is `72` (or close — one per export)

---

## Task 2: Update `registry.ts` — remove Phosphor `Icon` type

**Files:**
- Modify: `src/canvas/components/registry.ts:1,17`

The `icon: Icon` field in `ComponentDef` used a Phosphor-specific type. Replace it with a plain React FC type so the field accepts both Phosphor (gone) and Hugeicons wrappers.

- [ ] **Step 1: Edit registry.ts**

In `src/canvas/components/registry.ts`, replace line 1:
```ts
import type { Icon } from "@phosphor-icons/react";
```
with nothing (delete the line entirely).

Then replace the `icon: Icon;` field on line 17 with:
```ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any React component (Hugeicons wrapper or otherwise)
  icon: React.FC<any>;
```

The full changed region looks like:
```ts
// Line 1 removed (was: import type { Icon } from "@phosphor-icons/react";)
import type * as React from "react";
import type { Shape, ComponentKind } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";

export type CustomField = ...

export interface ComponentDef<P = Record<string, unknown>> {
  kind: ComponentKind;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any React component (Hugeicons wrapper or otherwise)
  icon: React.FC<any>;
  group: "structural" | "wireframe" | "software" | "flow";
  ...
```

- [ ] **Step 2: Verify no phosphor import remains in registry**

Run: `grep "@phosphor" src/canvas/components/registry.ts`

Expected: no output

---

## Task 3: Swap import in `src/canvas/components/code.ts`

**Files:**
- Modify: `src/canvas/components/code.ts:1`

- [ ] **Step 1: Replace the import**

Replace:
```ts
import { Code as Code2 } from "@phosphor-icons/react";
```
With:
```ts
import { Code2 } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/components/code.ts`

Expected: no output

---

## Task 4: Swap import in `src/canvas/components/frame.ts`

**Files:**
- Modify: `src/canvas/components/frame.ts:1`

- [ ] **Step 1: Replace the import**

Replace:
```ts
import { FrameCorners as Frame } from "@phosphor-icons/react";
```
With:
```ts
import { Frame } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/components/frame.ts`

Expected: no output

---

## Task 5: Swap import in `src/canvas/components/table.ts`

**Files:**
- Modify: `src/canvas/components/table.ts:1`

- [ ] **Step 1: Replace the import**

Replace:
```ts
import { Table } from "@phosphor-icons/react";
```
With:
```ts
import { Table } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/components/table.ts`

Expected: no output

---

## Task 6: Swap import in `src/canvas/AlignBar.tsx`

**Files:**
- Modify: `src/canvas/AlignBar.tsx:7-16`

- [ ] **Step 1: Replace the import block**

Replace:
```tsx
import {
  AlignLeft as AlignStartVertical,
  AlignCenterVertical,
  AlignRight as AlignEndVertical,
  AlignTop as AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignBottom as AlignEndHorizontal,
  Rows as AlignHorizontalDistributeCenter,
  Columns as AlignVerticalDistributeCenter,
} from "@phosphor-icons/react";
```
With:
```tsx
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/AlignBar.tsx`

Expected: no output

---

## Task 7: Swap import in `src/canvas/CommentsLayer.tsx`

**Files:**
- Modify: `src/canvas/CommentsLayer.tsx:11`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { ChatCircle as MessageSquare, Check, PaperPlaneRight as Send, Trash as Trash2, X, Smiley as Smile, DotsThree as MoreHorizontal } from "@phosphor-icons/react";
```
With:
```tsx
import { MessageSquare, Check, Send, Trash2, X, Smile, MoreHorizontal } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/CommentsLayer.tsx`

Expected: no output

---

## Task 8: Swap import in `src/canvas/ContextMenu.tsx`

**Files:**
- Modify: `src/canvas/ContextMenu.tsx:8`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { ArrowUp, ArrowDown, CaretUp as ChevronUp, CaretDown as ChevronDown, Copy, Lock, LockOpen as Unlock, Trash as Trash2 } from "@phosphor-icons/react";
```
With:
```tsx
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown, Copy, Lock, Unlock, Trash2 } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/ContextMenu.tsx`

Expected: no output

---

## Task 9: Swap import in `src/canvas/HoverConnectLayer.tsx`

**Files:**
- Modify: `src/canvas/HoverConnectLayer.tsx:11`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from "@phosphor-icons/react";
```
With:
```tsx
import { ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/HoverConnectLayer.tsx`

Expected: no output

---

## Task 10: Swap import in `src/canvas/Inspector.tsx`

**Files:**
- Modify: `src/canvas/Inspector.tsx:9`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { CaretDown as ChevronDown, Check, Eyedropper as Pipette } from "@phosphor-icons/react";
```
With:
```tsx
import { ChevronDown, Check, Pipette } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/Inspector.tsx`

Expected: no output

---

## Task 11: Swap import in `src/canvas/LinkLayer.tsx`

**Files:**
- Modify: `src/canvas/LinkLayer.tsx:7`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { LinkSimple as Link2 } from "@phosphor-icons/react";
```
With:
```tsx
import { Link2 } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/LinkLayer.tsx`

Expected: no output

---

## Task 12: Swap import in `src/canvas/RotateHandle.tsx`

**Files:**
- Modify: `src/canvas/RotateHandle.tsx:9`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { ArrowClockwise as RotateCw } from "@phosphor-icons/react";
```
With:
```tsx
import { RotateCw } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/RotateHandle.tsx`

Expected: no output

---

## Task 13: Swap import in `src/canvas/SelectionToolbar.tsx`

**Files:**
- Modify: `src/canvas/SelectionToolbar.tsx:10-44`

- [ ] **Step 1: Replace the import block**

Replace:
```tsx
import {
  TextB as Bold,
  TextItalic as Italic,
  TextUnderline as Underline,
  TextStrikethrough as Strikethrough,
  TextAlignLeft as AlignLeft,
  TextAlignCenter as AlignCenter,
  TextAlignRight as AlignRight,
  AlignTop as AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignBottom as AlignEndHorizontal,
  LinkSimple as Link2,
  Lock,
  LockOpen as Unlock,
  Trash as Trash2,
  Minus,
  Plus,
  Drop as Droplets,
  ArrowsOutSimple as Scaling,
  CaretDown as ChevronDown,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  Note as StickyNote,
  TextT as Type,
  Eyedropper as Pipette,
  ChatCircleDots as MessageSquarePlus,
  Path as Spline,
  ArrowElbowDownRight as CornerDownRight,
  ArrowRight,
  CaretRight as ChevronRight,
  ArrowsLeftRight as ArrowRightLeft,
} from "@phosphor-icons/react";
```
With:
```tsx
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Link2,
  Lock,
  Unlock,
  Trash2,
  Minus,
  Plus,
  Droplets,
  Scaling,
  ChevronDown,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  StickyNote,
  Type,
  Pipette,
  MessageSquarePlus,
  Spline,
  CornerDownRight,
  ArrowRight,
  ChevronRight,
  ArrowRightLeft,
} from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/canvas/SelectionToolbar.tsx`

Expected: no output

---

## Task 14: Swap import in `src/components/ui/dialog.tsx`

**Files:**
- Modify: `src/components/ui/dialog.tsx:6`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { X as XIcon } from "@phosphor-icons/react"
```
With:
```tsx
import { XIcon } from "@/components/icons"
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/components/ui/dialog.tsx`

Expected: no output

---

## Task 15: Swap import in `src/ui/HelpButton.tsx`

**Files:**
- Modify: `src/ui/HelpButton.tsx:8`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { Question as HelpCircle } from "@phosphor-icons/react";
```
With:
```tsx
import { HelpCircle } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/ui/HelpButton.tsx`

Expected: no output

---

## Task 16: Swap import in `src/ui/Minimap.tsx`

**Files:**
- Modify: `src/ui/Minimap.tsx:10`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { CaretDown as ChevronDown, ArrowsOut as Maximize } from "@phosphor-icons/react";
```
With:
```tsx
import { ChevronDown, Maximize } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/ui/Minimap.tsx`

Expected: no output

---

## Task 17: Swap import in `src/ui/PenToolbar.tsx`

**Files:**
- Modify: `src/ui/PenToolbar.tsx:8`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { PencilSimple as Pen, Highlighter, Eraser } from "@phosphor-icons/react";
```
With:
```tsx
import { Pen, Highlighter, Eraser } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/ui/PenToolbar.tsx`

Expected: no output

---

## Task 18: Swap import in `src/ui/Toolbar.tsx`

**Files:**
- Modify: `src/ui/Toolbar.tsx:9-24`

- [ ] **Step 1: Replace the import block**

Replace:
```tsx
import {
  Cursor as MousePointer2,
  Hand,
  TextT as Type,
  Note as StickyNote,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  ArrowUpRight as MoveUpRight,
  PencilSimple as Pencil,
  Shapes,
  ChatCircle as MessageSquare,
  PlusSquare as SquarePlus,
} from "@phosphor-icons/react";
```
With:
```tsx
import {
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  MoveUpRight,
  Pencil,
  Shapes,
  MessageSquare,
  SquarePlus,
} from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/ui/Toolbar.tsx`

Expected: no output

---

## Task 19: Swap import in `src/ui/TopBar.tsx`

**Files:**
- Modify: `src/ui/TopBar.tsx:10-20`

- [ ] **Step 1: Replace the import block**

Replace:
```tsx
import {
  TreeStructure as Workflow,
  SquaresFour as LayoutGrid,
  MagnifyingGlass as Search,
  Gear as Settings,
  DownloadSimple as Download,
  ArrowsOut as Maximize,
  House as Home,
  ArrowUUpLeft as Undo2,
  ArrowUUpRight as Redo2,
} from "@phosphor-icons/react";
```
With:
```tsx
import {
  Workflow,
  LayoutGrid,
  Search,
  Settings,
  Download,
  Maximize,
  Home,
  Undo2,
  Redo2,
} from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/ui/TopBar.tsx`

Expected: no output

---

## Task 20: Swap import in `src/ui/ZoomControl.tsx`

**Files:**
- Modify: `src/ui/ZoomControl.tsx:7`

- [ ] **Step 1: Replace the import**

Replace:
```tsx
import { ArrowUUpLeft as Undo2, ArrowUUpRight as Redo2, Minus, Plus, ChatCircle as MessageSquare } from "@phosphor-icons/react";
```
With:
```tsx
import { Undo2, Redo2, Minus, Plus, MessageSquare } from "@/components/icons";
```

- [ ] **Step 2: Verify**

Run: `grep "@phosphor" src/ui/ZoomControl.tsx`

Expected: no output

---

## Task 21: Remove `IconProvider` — delete file + unwrap `app/layout.tsx`

**Files:**
- Delete: `src/components/IconProvider.tsx`
- Modify: `app/layout.tsx:6,25-27`

- [ ] **Step 1: Delete the IconProvider file**

Delete `src/components/IconProvider.tsx` (the Phosphor `IconContext.Provider` wrapper; Hugeicons uses no global context).

- [ ] **Step 2: Edit `app/layout.tsx`**

Replace the full file content with:
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Cofield — realtime collaborative canvas",
  description:
    "An infinite collaborative canvas. Multiple teams, one board, edited in real time on CRDTs — live cursors, presence, offline-safe merge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      {/* font-sans / font-hand are wired to next/font in M0 polish */}
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify no phosphor remains in layout or IconProvider**

Run: `grep -r "@phosphor" app/layout.tsx src/components/IconProvider.tsx 2>/dev/null`

Expected: no output (IconProvider file is deleted, layout has no phosphor import)

---

## Task 22: Uninstall `@phosphor-icons/react`

**Files:** package.json (modified by pnpm)

- [ ] **Step 1: Remove the package**

```bash
export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm remove @phosphor-icons/react
```

Expected output contains: `removed 1 package` or similar; no errors.

- [ ] **Step 2: Confirm removal**

Run: `grep "@phosphor-icons" package.json`

Expected: no output

---

## Task 23: Typecheck + Lint + Final Verification

**Files:** read-only verification pass

- [ ] **Step 1: Run typecheck**

```bash
export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm typecheck
```

Expected: exits 0, no errors. If errors appear:
- `Module '"@/components/icons"' has no exported member 'X'` → add the missing export to `src/components/icons.tsx`
- `Type 'FC<IconProps>' is not assignable to type 'Icon'` → the `registry.ts` `icon` field fix in Task 2 should have eliminated this; re-check that `icon: React.FC<any>` is in place
- `Cannot find module '@hugeicons/core-free-icons'` → run `pnpm install` first

- [ ] **Step 2: Run lint**

```bash
export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm lint
```

Expected: exits 0, no warnings or errors. If ESLint complains about `@typescript-eslint/no-explicit-any` on the `make` function: the `eslint-disable-next-line` comment in `icons.tsx` should suppress it. If it appears on `registry.ts` instead: add the same suppression comment above `icon: React.FC<any>`.

- [ ] **Step 3: Confirm zero phosphor imports remain**

```bash
grep -rl "@phosphor-icons/react" src app
```

Expected: no output (empty)

- [ ] **Step 4: Write the report file**

Create `D:/portfolio-github/cofield/.superpowers/hugeicons-report.md` with:
- Final local-name → Hugeicons mapping table (copy from plan header)
- Substitution notes (copy from plan header)
- List of files touched (21 files modified, 1 deleted, 1 created)
- `pnpm typecheck` output
- `pnpm lint` output
- Confirmation that `grep -rl "@phosphor-icons/react" src app` returned empty
