/**
 * The active-user avatar stack. Shows everyone in the room with their stable
 * color; overflow collapses to "+N". Empty state (solo) shows a quiet indicator.
 */
"use client";

import type { Presence } from "@/collab/types";

export interface AvatarStackProps {
  presences: Presence[];
  /** the local user, rendered first */
  self: Pick<Presence, "userId" | "name" | "color">;
  max?: number;
}

export function AvatarStack(_props: AvatarStackProps) {
  // TODO(M4): render initials + color chips; collapse overflow to "+N";
  // empty (solo) → a subtle "Only you" indicator, not a marketing card.
  return null;
}
