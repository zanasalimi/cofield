/**
 * Active-user avatar stack for the header. Reads presence from the UI store so it
 * can mount outside the canvas. Everyone in the room shows as a coloured initial;
 * click a remote user to follow their viewport (click again to stop). Avatars
 * overlap (BrainScape style); the followed user is ringed.
 */
"use client";

import { useUiStore } from "@/store/ui-store";

function initial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function AvatarStack() {
  const me = useUiStore((s) => s.me);
  const presences = useUiStore((s) => s.presences);
  const following = useUiStore((s) => s.followingId);
  const setFollowing = useUiStore((s) => s.setFollowing);

  const others = presences.slice(0, 5);
  const overflow = presences.length - others.length;

  return (
    <div className="flex items-center gap-2.5">
      {/* Other people in the room cluster on the LEFT. */}
      {others.length > 0 || overflow > 0 ? (
        <div className="flex items-center -space-x-2">
          {others.map((p) => {
            const isFollowed = following === p.userId;
            return (
              <button
                key={p.userId}
                type="button"
                title={isFollowed ? `Following ${p.name} — click to stop` : `Follow ${p.name}`}
                onClick={() => setFollowing(isFollowed ? null : p.userId)}
                className={`grid size-9 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-white transition-transform hover:z-10 hover:scale-110 active:scale-95 ${
                  isFollowed ? "ring-ink" : ""
                }`}
                style={{ backgroundColor: p.color }}
              >
                {initial(p.name)}
              </button>
            );
          })}
          {overflow > 0 ? (
            <div className="grid size-9 place-items-center rounded-full bg-ink/10 text-xs font-medium text-ink-soft ring-2 ring-white">
              +{overflow}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* The local user sits on the RIGHT, selected: ringed with a small gap. */}
      {me ? (
        <div
          title={`${me.name} (you)`}
          className="grid size-9 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-primary ring-offset-2 ring-offset-chrome"
          style={{ backgroundColor: me.color }}
        >
          {initial(me.name)}
        </div>
      ) : null}
    </div>
  );
}
