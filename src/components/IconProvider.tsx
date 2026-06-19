/**
 * Global Phosphor icon defaults. Sets the duotone weight for every icon so the
 * UI reads soft and friendly without per-icon props; size is still controlled
 * per use via Tailwind `size-*` classes (which override the default 1em).
 */
"use client";

import { IconContext } from "@phosphor-icons/react";

export function IconProvider({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={{ weight: "duotone" }}>{children}</IconContext.Provider>;
}
