/**
 * useBoard — owns a board's realtime lifecycle for the canvas page. Creates the
 * Y.Doc, connects the websocket provider, binds the document to the board store
 * (so the renderer's shape cache stays in sync), and exposes presence plus
 * throttled cursor/selection publishers.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { createBoardDoc, readShapesInOrder } from "./doc";
import { createWebsocketProvider, type SyncProvider } from "./provider";
import {
  setLocalIdentity,
  setLocalCursor,
  setLocalSelection,
  onPresenceChange,
  readPresenceStates,
  CURSOR_THROTTLE_MS,
} from "./awareness";
import { useBoardStore } from "@/store/board-store";
import { CURSOR_COLORS, type ConnectionState, type Point, type Presence } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";
const NAMES = ["Otter", "Heron", "Fox", "Marten", "Wren", "Lynx", "Finch", "Vole"];

export function useBoard(boardId: string) {
  const [presences, setPresences] = useState<Presence[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const providerRef = useRef<SyncProvider | null>(null);
  const lastCursorAt = useRef(0);

  useEffect(() => {
    const doc = new Y.Doc();
    const board = createBoardDoc(doc);
    const provider = createWebsocketProvider({ url: WS_URL, room: boardId, doc });
    providerRef.current = provider;

    // Bind the document to the renderer's shape cache.
    const store = useBoardStore.getState();
    store.bindDoc(board);
    const refresh = () => useBoardStore.getState()._setShapes(readShapesInOrder(board));
    board.shapes.observeDeep(refresh);
    board.order.observe(refresh);
    refresh();

    // Stable per-session identity for presence (the auth user replaces this in M3).
    const cid = provider.awareness.clientID;
    setLocalIdentity(provider.awareness, {
      userId: String(cid),
      name: NAMES[cid % NAMES.length]!,
      color: CURSOR_COLORS[cid % CURSOR_COLORS.length]!,
    });

    const offPresence = onPresenceChange(provider.awareness, setPresences);
    const offState = provider.onStateChange(setConnection);
    setPresences(readPresenceStates(provider.awareness));
    setConnection(provider.state);

    return () => {
      board.shapes.unobserveDeep(refresh);
      board.order.unobserve(refresh);
      offPresence();
      offState();
      useBoardStore.getState().unbindDoc();
      provider.destroy();
      doc.destroy();
      providerRef.current = null;
    };
  }, [boardId]);

  const publishCursor = useCallback((cursor: Point | null) => {
    const p = providerRef.current;
    if (!p) return;
    const now = Date.now();
    if (cursor && now - lastCursorAt.current < CURSOR_THROTTLE_MS) return;
    lastCursorAt.current = now;
    setLocalCursor(p.awareness, cursor);
  }, []);

  const publishSelection = useCallback((ids: string[]) => {
    const p = providerRef.current;
    if (p) setLocalSelection(p.awareness, ids);
  }, []);

  return { presences, connection, publishCursor, publishSelection };
}
