/**
 * The component inspector — a right-side panel that renders one shadcn control
 * per `CustomField` in the selected component's `customSchema`, writing every
 * change through `updateComponentProps`. Controls (Popover colour picker,
 * Popover select, Switch, Slider, Input) match the app's design language.
 */
"use client";

import { CaretDown as ChevronDown, Check, Eyedropper as Pipette } from "@phosphor-icons/react";
import { getComponentDef, type CustomField } from "@/canvas/components/registry";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const SWATCHES = [
  "#FFFFFF", "#F4F4F6", "#E7E5E0", "#9A9AB0", "#6B6B66", "#1A1A1A", "#0B0B22", "#37352F",
  "#FFE8A3", "#FF9F1C", "#FFC2D1", "#F8B4B4", "#BBE5B3", "#A7E8E0", "#BFE3FF", "#D9C2FF",
  "#E03E3E", "#0F9D58", "#4262FF", "#9333EA",
];

export function Inspector() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const shapes = useBoardStore((s) => s.shapes);
  if (selection.length !== 1 || editingId) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape || shape.type !== "component" || !shape.kind) return null;

  const def = getComponentDef(shape.kind);
  const props = shape.props ?? {};
  const set = (key: string, value: unknown) => useBoardStore.getState().updateComponentProps(shape.id, { [key]: value });

  return (
    <div className="animate-pop pointer-events-auto w-64 rounded-2xl border border-hairline bg-chrome p-3.5 shadow-toolbar">
      <p className="mb-3 px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{def.label}</p>
      <div className="flex flex-col gap-3.5">
        {def.customSchema.map((f) => (
          <Field key={f.key} field={f} value={props[f.key]} onChange={(v) => set(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

function Stack({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function Field({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.kind) {
    case "text":
      return (
        <Stack label={field.label}>
          <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="h-9" />
        </Stack>
      );
    case "number":
      return (
        <Row label={field.label}>
          <Input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={Number(value ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 w-20"
          />
        </Row>
      );
    case "slider": {
      const v = Number(value ?? field.min ?? 0);
      return (
        <Stack label={field.label}>
          <div className="flex items-center gap-3">
            <Slider
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              value={[v]}
              onValueChange={([n]) => onChange(n ?? v)}
            />
            <span className="w-7 text-right text-xs tabular-nums text-ink-soft">{v}</span>
          </div>
        </Stack>
      );
    }
    case "toggle":
      return (
        <Row label={field.label}>
          <Switch checked={Boolean(value)} onCheckedChange={(c) => onChange(c)} />
        </Row>
      );
    case "color":
      return (
        <Row label={field.label}>
          <ColorPick value={String(value ?? "#FFFFFF")} onChange={onChange} />
        </Row>
      );
    case "select":
      return (
        <Row label={field.label}>
          <SelectPick value={String(value ?? "")} options={field.options} onChange={onChange} />
        </Row>
      );
  }
}

function ColorPick({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Colour"
          className="size-8 rounded-lg border border-black/15 transition-transform hover:scale-105 active:scale-95"
          style={{ background: value }}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <div className="grid grid-cols-8 gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="size-6 rounded-md border border-black/10 transition-transform hover:scale-110 active:scale-95"
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2 border-t border-hairline pt-2.5 text-xs text-ink-soft">
          <span
            className="grid size-7 place-items-center rounded-md text-white"
            style={{ background: "conic-gradient(from 90deg, #ff5c5c, #ffd93b, #6ddf6d, #4dd0e1, #5b8cff, #c44cd9, #ff5c5c)" }}
          >
            <Pipette className="size-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
          </span>
          Custom
          <span className="ml-auto tabular-nums">{value.toUpperCase()}</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" aria-label="Custom colour" />
        </label>
      </PopoverContent>
    </Popover>
  );
}

function SelectPick({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: unknown) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-28 items-center justify-between gap-1.5 rounded-lg border border-hairline px-2.5 text-sm text-ink transition-colors hover:bg-muted"
        >
          {current?.label ?? value}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="flex flex-col">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted ${o.value === value ? "bg-muted" : ""}`}
            >
              {o.label}
              {o.value === value ? <Check className="size-3.5 text-primary" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
