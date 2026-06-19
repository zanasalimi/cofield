/**
 * Comment pins + threads. Every comment is a speech-pin anchored at a world
 * point; clicking opens a thread of messages with a reply box and a resolve
 * toggle. Resolved comments are hidden (until reopened). Empty pins (placed but
 * never written to) are removed when their thread closes — no stray markers.
 */
"use client";

import { useEffect, useRef } from "react";
import { MessageSquare, Check, Send, Trash2, X } from "lucide-react";
import type { Comment } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Thread({ comment }: { comment: Comment }) {
  const me = useUiStore((s) => s.me);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const close = () => {
    if (comment.messages.length === 0) useBoardStore.getState().removeComment(comment.id);
    useUiStore.getState().setOpenCommentId(null);
  };
  const send = () => {
    const text = ref.current?.value.trim();
    if (!text || !me) return;
    useBoardStore.getState().addCommentMessage(comment.id, {
      id: crypto.randomUUID(),
      author: me.name,
      color: me.color,
      text,
      ts: Date.now(),
    });
    if (ref.current) ref.current.value = "";
  };

  return (
    <div
      className="animate-pop-left pointer-events-auto absolute left-4 top-0 w-72 rounded-2xl border border-hairline bg-chrome p-3 shadow-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const next = !comment.resolved;
            useBoardStore.getState().resolveComment(comment.id, next);
            if (next) useUiStore.getState().setOpenCommentId(null);
          }}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-muted ${comment.resolved ? "text-cursor-fern" : "text-ink-soft"}`}
        >
          <Check className="size-3.5" /> {comment.resolved ? "Resolved" : "Resolve"}
        </button>
        <div className="flex gap-0.5">
          {comment.messages.length > 0 ? (
            <button
              type="button"
              title="Delete thread"
              onClick={() => {
                useBoardStore.getState().removeComment(comment.id);
                useUiStore.getState().setOpenCommentId(null);
              }}
              className="grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-muted hover:text-cursor-coral"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
          <button type="button" title="Close" onClick={close} className="grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-muted">
            <X className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="mb-2 flex max-h-60 flex-col gap-3 overflow-y-auto">
        {comment.messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: m.color }}>
              {initial(m.author)}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-ink">{m.author}</span>
                <span className="text-[10px] text-ink-soft">{relTime(m.ts)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{m.text}</p>
            </div>
          </div>
        ))}
        {comment.messages.length === 0 ? <p className="px-0.5 text-xs text-ink-soft">Start the thread…</p> : null}
      </div>

      <form className="flex items-end gap-1.5" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          ref={ref}
          rows={1}
          placeholder={comment.messages.length ? "Reply…" : "Comment…"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            if (e.key === "Escape") close();
          }}
          className="max-h-24 flex-1 resize-none rounded-lg border border-hairline bg-muted/50 px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-primary"
        />
        <button type="submit" title="Send" className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white transition-transform duration-100 active:scale-90">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function CommentsLayer() {
  const viewport = useUiStore((s) => s.viewport);
  const openId = useUiStore((s) => s.openCommentId);
  const me = useUiStore((s) => s.me);
  const comments = useBoardStore((s) => s.comments);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {comments.map((c) => {
        if (c.resolved && c.id !== openId) return null;
        const p = worldToScreen(viewport, { x: c.x, y: c.y });
        const open = c.id === openId;
        const first = c.messages[0];
        const color = first?.color ?? me?.color ?? "#1A1A1A";
        return (
          <div key={c.id} className="absolute" style={{ left: p.x, top: p.y }}>
            <button
              type="button"
              onClick={() => useUiStore.getState().setOpenCommentId(open ? null : c.id)}
              className="pointer-events-auto grid size-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full rounded-bl-none border-2 border-white text-xs font-semibold text-white shadow-md transition-transform duration-100 hover:scale-110 active:scale-95"
              style={{ background: color }}
            >
              {first ? initial(first.author) : <MessageSquare className="size-4" />}
            </button>
            {open ? <Thread comment={c} /> : null}
          </div>
        );
      })}
    </div>
  );
}
