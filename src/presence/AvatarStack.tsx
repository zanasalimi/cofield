/**
 * Active-user avatar stack (top-right). Shows everyone in the room as a coloured
 * initial; click a remote user to follow their viewport (click again to stop).
 * The followed user is ringed.
 */
"use client";

import type { Presence } from "@/collab/types";
import type { LocalIdentity } from "@/collab/use-board";
import { useUiStore } from "@/store/ui-store";

function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function AvatarStack({ presences, me }: { presences: Presence[]; me: LocalIdentity | null }) {
  const following = useUiStore((s) => s.followingId);
  const setFollowing = useUiStore((s) => s.setFollowing);

  const others = presences.slice(0, 6);
  const overflow = presences.length - others.length;

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-hairline bg-chrome px-1.5 py-1 shadow-toolbar">
      {me ? (
        <div
          title={`${me.name} (you)`}
          className="grid size-7 place-items-center rounded-full text-xs font-semibold text-white ring-2 ring-white"
          style={{ backgroundColor: me.color }}
        >
          {initial(me.name)}
        </div>
      ) : null}
      {others.map((p) => {
        const isFollowed = following === p.userId;
        return (
          <button
            key={p.userId}
            type="button"
            title={isFollowed ? `Following ${p.name} — click to stop` : `Follow ${p.name}`}
            onClick={() => setFollowing(isFollowed ? null : p.userId)}
            className={`grid size-7 place-items-center rounded-full text-xs font-semibold text-white transition-transform hover:scale-105 active:scale-95 ${
              isFollowed ? "ring-2 ring-ink" : ""
            }`}
            style={{ backgroundColor: p.color }}
          >
            {initial(p.name)}
          </button>
        );
      })}
      {overflow > 0 ? (
        <div className="grid size-7 place-items-center rounded-full bg-ink/10 text-xs font-medium text-ink-soft">
          +{overflow}
        </div>
      ) : null}
    </div>
  );
}
