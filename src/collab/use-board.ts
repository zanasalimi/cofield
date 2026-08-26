/**
 * useBoard owns a board's realtime lifecycle for the canvas page. Creates the
 * Y.Doc, connects the websocket provider, binds the document to the board store
 * (so the renderer's shape cache stays in sync), and exposes presence plus
 * throttled cursor/selection publishers.
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import * as Y from "yjs";
import { toast } from "@embertoast/react";
import { createBoardDoc, readShapesInOrder, readMeta, readComments } from "./doc";
import { bindOfflineCache } from "./offline";
import { createWebsocketProvider, type SyncProvider } from "./provider";
import {
  setLocalIdentity,
  setLocalCursor,
  setLocalSelection,
  setLocalViewport,
  onPresenceChange,
  readPresenceStates,
  CURSOR_THROTTLE_MS,
} from "./awareness";
import { useBoardStore } from "@/store/board-store";
import { useUiStore } from "@/store/ui-store";
import { CURSOR_COLORS, type Point } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4321";

export interface LocalIdentity {
  userId: string;
  name: string;
  color: string;
}

export function useBoard(boardId: string, user: { id: string; name: string; color: string }) {
  // Presence (identity + remote cursors) is an *external* store: Yjs Awareness.
  // It's written straight into the UI store rather than React state, so a cursor
  // moving re-renders only the leaves that select it (CursorsLayer, the avatar
  // stack), never the whole canvas tree. Connection state rides along for the
  // same reason: only ConnectionStatus subscribes to it.
  const providerRef = useRef<SyncProvider | null>(null);
  const lastCursorAt = useRef(0);

  useEffect(() => {
    const doc = new Y.Doc();
    const board = createBoardDoc(doc);
    const offline = bindOfflineCache(doc, boardId, () => {
      toast.warning("Offline editing is off. This browser is blocking local storage.");
    });
    const provider = createWebsocketProvider({ url: WS_URL, room: boardId, doc });
    providerRef.current = provider;

    const store = useBoardStore.getState();
    store.bindDoc(board);
    const refresh = () => useBoardStore.getState()._setShapes(readShapesInOrder(board));
    board.shapes.observeDeep(refresh);
    board.order.observe(refresh);
    refresh();

    const refreshMeta = () => useBoardStore.getState()._setMeta(readMeta(board));
    board.meta.observe(refreshMeta);
    refreshMeta();

    const refreshComments = () => useBoardStore.getState()._setComments(readComments(board));
    board.comments.observeDeep(refreshComments);
    refreshComments();

    // Presence identity comes from the session, so a name and colour are stable
    // across refreshes and machines.
    const cid = provider.awareness.clientID;
    const identity: LocalIdentity = {
      userId: user.id,
      name: user.name,
      color: user.color || CURSOR_COLORS[cid % CURSOR_COLORS.length]!,
    };
    setLocalIdentity(provider.awareness, identity);
    const ui = useUiStore.getState();
    ui.setMe(identity);

    const offPresence = onPresenceChange(provider.awareness, ui.setPresences);
    const offState = provider.onStateChange((state, reason) => {
      useUiStore.getState().setConnection(state, reason);
    });
    const offSync = provider.onSyncChange((synced) => useUiStore.getState().setSynced(synced));
    ui.setPresences(readPresenceStates(provider.awareness));
    ui.setConnection(provider.state, provider.reason);

    return () => {
      board.shapes.unobserveDeep(refresh);
      board.order.unobserve(refresh);
      board.meta.unobserve(refreshMeta);
      board.comments.unobserveDeep(refreshComments);
      offPresence();
      offState();
      offSync();
      const ui2 = useUiStore.getState();
      ui2.setPresences([]);
      ui2.setMe(null);
      ui2.setConnection("connecting");
      ui2.setSynced(false);
      useBoardStore.getState().unbindDoc();
      provider.destroy();
      offline.destroy();
      doc.destroy();
      providerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, user.id, user.name]);

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

  const publishViewport = useCallback((vp: { x: number; y: number; zoom: number }) => {
    const p = providerRef.current;
    if (p) setLocalViewport(p.awareness, vp);
  }, []);

  return { publishCursor, publishSelection, publishViewport };
}
