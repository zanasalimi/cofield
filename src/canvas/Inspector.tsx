// src/canvas/Inspector.tsx
"use client";

import { getComponentDef, type CustomField } from "@/canvas/components/registry";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { Input } from "@/components/ui/input";

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
    <div className="pointer-events-auto w-64 rounded-2xl border border-hairline bg-chrome p-3 shadow-toolbar">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{def.label}</p>
      <div className="flex flex-col gap-3">
        {def.customSchema.map((f) => (
          <Field key={f.key} field={f} value={props[f.key]} onChange={(v) => set(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

function Field({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (v: unknown) => void }) {
  const label = <span className="mb-1 block text-xs text-ink-soft">{field.label}</span>;
  if (field.kind === "text")
    return <label>{label}<Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="h-9" /></label>;
  if (field.kind === "number")
    return <label>{label}<Input type="number" min={field.min} max={field.max} step={field.step} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="h-9" /></label>;
  if (field.kind === "toggle")
    return <label className="flex items-center justify-between"><span className="text-sm text-ink">{field.label}</span><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" /></label>;
  if (field.kind === "color")
    return <label>{label}<input type="color" value={String(value ?? "#FFFFFF")} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-hairline" /></label>;
  // select
  return (
    <label>{label}
      <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-hairline bg-transparent px-2 text-sm text-ink">
        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
