/**
 * Follow-mode sync. When you follow a remote user, their broadcast viewport is
 * mirrored onto yours each time their presence updates. This lives in its own
 * leaf — which renders nothing — so subscribing to presence here doesn't
 * re-render the canvas; only this component reacts to the cursor-frequency
 * presence updates, and it does no work unless you're actually following someone.
 */
"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/ui-store";

export function FollowSync() {
  const followingId = useUiStore((s) => s.followingId);
  const presences = useUiStore((s) => s.presences);

  useEffect(() => {
    if (!followingId) return;
    const target = presences.find((p) => p.userId === followingId);
    const t = target?.viewport;
    if (!t) return;
    const vp = useUiStore.getState().viewport;
    if (vp.x !== t.x || vp.y !== t.y || vp.zoom !== t.zoom) useUiStore.getState().setViewport({ ...t });
  }, [followingId, presences]);

  return null;
}
