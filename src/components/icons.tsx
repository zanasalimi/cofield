/**
 * Central icon module. Wraps Hugeicons (outline/stroke) in lucide-compatible
 * named components so usage sites stay `<Square className="size-5" />`. Swapping
 * the underlying icon set again only touches this one file.
 */
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- core-free-icons exports untyped icon-data objects; HugeiconsIcon validates them at runtime
const make = (icon: any) => {
  const Icon = (props: IconProps) => <HugeiconsIcon icon={icon} {...props} />;
  Icon.displayName = "HugeIcon";
  return Icon;
};

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
