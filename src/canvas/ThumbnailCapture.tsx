/**
 * Keeps the board's dashboard snapshot current.
 *
 * Renders nothing. It watches the shape cache, waits for edits to settle, and
 * uploads a small picture of the board. The work is deliberately lazy: a
 * thumbnail is worth a few kilobytes and a render every so often, not a render
 * per frame, so it debounces hard and skips when nothing actually changed.
 */
"use client";

import { useEffect, useRef } from "react";
import { useBoardStore } from "@/store/board-store";
import { useUiStore } from "@/store/ui-store";
import { renderBoardThumbnail } from "./thumbnail";

/** Long enough that a drag, a paste or a template drop counts as one edit. */
const SETTLE_MS = 4000;

export function ThumbnailCapture({ boardId }: { boardId: string }) {
  const shapes = useBoardStore((s) => s.shapes);
  // Being connected is not enough: the socket opens before the first exchange,
  // so an empty document could still mean "the server has not answered yet".
  // Without this an emptied board could never clear its old picture, and a
  // half-loaded one could overwrite a good picture with a blank.
  const synced = useUiStore((s) => s.synced);
  const lastSent = useRef<string | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!synced) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // null is meaningful once synced: the board really is empty, and the card
      // should fall back to its placeholder rather than keep a stale diagram.
      const image = renderBoardThumbnail(useBoardStore.getState().shapes);
      if (image === lastSent.current) return;
      lastSent.current = image;
      void fetch(`/api/boards/${boardId}/thumbnail`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnail: image }),
      }).catch(() => {
        // Nothing the person on this board needs to hear about. Retry on the
        // next edit by forgetting what we thought we had stored.
        lastSent.current = undefined;
      });
    }, SETTLE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [shapes, boardId, synced]);

  return null;
}
