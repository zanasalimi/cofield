/**
 * Comment pins + threads. A pin is anchored at a world point and is draggable
 * like any object; hovering it previews the latest message, clicking opens the
 * full thread. A brand-new pin shows only a composer (nothing to resolve yet);
 * once it has messages the thread gains a header with a colour theme, resolve and
 * delete. Resolved threads stay on the board (dimmed) until someone removes them.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ChatCircle as MessageSquare, Check, PaperPlaneRight as Send, Trash as Trash2, X, Smiley as Smile, DotsThree as MoreHorizontal } from "@phosphor-icons/react";
import type { Comment } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { worldToScreen, screenToWorld } from "./viewport/viewport";

const THEME_COLORS = ["#6B6B66", "#3FA34D", "#E03E3E", "#2D9CDB", "#1A1A1A"];
const EMOJIS = [
  "👍", "👎", "🙌", "👏", "🙏", "👋", "🤝", "💪",
  "🎉", "🔥", "⭐", "✨", "💯", "💡", "🚀", "👀",
  "😀", "😄", "😅", "😂", "🙂", "😍", "🥰", "😎",
  "🤔", "😬", "😮", "😴", "😢", "😡", "🥳", "🤯",
  "❤️", "💜", "💙", "💚", "✅", "❌", "⚠️", "❓",
];

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

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" title="Emoji" className="grid size-9 shrink-0 place-items-center rounded-xl border border-hairline text-ink-soft transition-colors hover:bg-muted hover:text-ink">
          <Smile className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onPick(e)}
              className="grid size-9 place-items-center rounded-lg text-2xl leading-none transition-transform hover:scale-125 hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Composer({ comment }: { comment: Comment }) {
  const me = useUiStore((s) => s.me);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fresh = comment.messages.length === 0;

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const insertEmoji = (emoji: string) => {
    const ta = ref.current;
    if (!ta) return;
    const a = ta.selectionStart ?? ta.value.length;
    const b = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, a) + emoji + ta.value.slice(b);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = a + emoji.length;
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
    <div className="flex items-end gap-1.5">
      <textarea
        ref={ref}
        rows={1}
        placeholder={fresh ? "Add a comment…" : "Reply…"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
          if (e.key === "Escape") {
            if (fresh) useBoardStore.getState().removeComment(comment.id);
            useUiStore.getState().setOpenCommentId(null);
          }
        }}
        className="max-h-24 min-h-9 flex-1 resize-none rounded-xl border border-hairline bg-muted/40 px-3 py-[0.5rem] text-sm leading-5 text-ink outline-none transition-colors focus:border-primary"
      />
      <EmojiPicker onPick={insertEmoji} />
      <button type="submit" title="Send" onClick={send} className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white transition-transform duration-100 hover:bg-primary/90 active:scale-90">
        <Send className="size-5" />
      </button>
    </div>
  );
}

function Thread({ comment }: { comment: Comment }) {
  const fresh = comment.messages.length === 0;
  const close = () => {
    if (fresh) useBoardStore.getState().removeComment(comment.id);
    useUiStore.getState().setOpenCommentId(null);
  };

  return (
    <div
      className="animate-pop-left pointer-events-auto absolute left-5 top-0 w-80 rounded-2xl border border-hairline bg-chrome p-3 shadow-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header — only once the thread actually has comments. */}
      {!fresh ? (
        <header className="mb-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => useBoardStore.getState().resolveComment(comment.id, !comment.resolved)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-muted ${comment.resolved ? "text-cursor-fern" : "text-ink-soft"}`}
          >
            <span className={`grid size-4 place-items-center rounded-full border ${comment.resolved ? "border-cursor-fern bg-cursor-fern text-white" : "border-ink-soft/50"}`}>
              {comment.resolved ? <Check className="size-3" /> : null}
            </span>
            {comment.resolved ? "Resolved" : "Resolve"}
          </button>
          <div className="ml-1 flex items-center gap-0.5">
            {THEME_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title="Theme colour"
                onClick={() => useBoardStore.getState().setCommentColor(comment.id, c)}
                className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors ${comment.color === c ? "bg-ink/10" : "hover:bg-muted"}`}
              >
                <span className="size-3.5 rounded-full" style={{ background: c }} />
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" title="More" className="ml-auto grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-muted">
                <MoreHorizontal className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-36 p-1">
              <button
                type="button"
                onClick={() => {
                  useBoardStore.getState().removeComment(comment.id);
                  useUiStore.getState().setOpenCommentId(null);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-cursor-coral transition-colors hover:bg-muted"
              >
                <Trash2 className="size-3.5" /> Delete thread
              </button>
            </PopoverContent>
          </Popover>
          <button type="button" title="Close" onClick={close} className="grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-muted">
            <X className="size-4" />
          </button>
        </header>
      ) : (
        <button type="button" title="Cancel" onClick={close} className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-muted">
          <X className="size-4" />
        </button>
      )}

      {!fresh ? (
        <div className="mb-2.5 flex max-h-72 flex-col gap-3 overflow-y-auto">
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
        </div>
      ) : null}

      <Composer comment={comment} />
    </div>
  );
}

function Pin({ comment, viewport, layerRef }: { comment: Comment; viewport: { x: number; y: number; zoom: number }; layerRef: React.RefObject<HTMLDivElement | null> }) {
  const openId = useUiStore((s) => s.openCommentId);
  const open = openId === comment.id;
  const [hover, setHover] = useState(false);
  const down = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const p = worldToScreen(viewport, { x: comment.x, y: comment.y });
  const first = comment.messages[0];
  const last = comment.messages[comment.messages.length - 1];
  const color = comment.color || first?.color || "#6B6B66";

  const worldAt = (clientX: number, clientY: number) => {
    const r = layerRef.current?.getBoundingClientRect();
    return screenToWorld(viewport, { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) });
  };

  return (
    <div className="absolute" style={{ left: p.x, top: p.y }}>
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          down.current = { x: e.clientX, y: e.clientY };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!down.current) return;
          if (Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 4) {
            moved.current = true;
            setHover(false);
            const w = worldAt(e.clientX, e.clientY);
            useBoardStore.getState().moveComment(comment.id, w.x, w.y);
          }
        }}
        onPointerUp={() => {
          if (!moved.current) useUiStore.getState().setOpenCommentId(open ? null : comment.id);
          else useBoardStore.getState().commitHistory();
          down.current = null;
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className={`pointer-events-auto grid size-10 -translate-x-1/2 -translate-y-full cursor-grab touch-none place-items-center rounded-full rounded-bl-none border-2 border-white text-sm font-semibold text-white shadow-md transition-transform duration-100 hover:scale-110 active:scale-95 active:cursor-grabbing ${comment.resolved && !open ? "opacity-45" : ""}`}
        style={{ background: color }}
      >
        {first ? initial(first.author) : <MessageSquare className="size-5" />}
        {comment.resolved ? (
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-white bg-cursor-fern text-white">
            <Check className="size-2.5" />
          </span>
        ) : null}
      </button>

      {/* Hover preview of the latest message (only when the thread is closed). */}
      {hover && !open && last ? (
        <div className="animate-pop pointer-events-none absolute left-4 top-0 w-56 -translate-y-full rounded-xl border border-hairline bg-chrome p-2.5 shadow-toolbar">
          <div className="mb-0.5 flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-ink">{last.author}</span>
            <span className="text-[10px] text-ink-soft">{relTime(last.ts)}</span>
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-ink">{last.text}</p>
          {comment.messages.length > 1 ? (
            <p className="mt-1 text-[11px] text-ink-soft">{comment.messages.length} comments</p>
          ) : null}
        </div>
      ) : null}

      {open ? <Thread comment={comment} /> : null}
    </div>
  );
}

export function CommentsLayer() {
  const viewport = useUiStore((s) => s.viewport);
  const comments = useBoardStore((s) => s.comments);
  const layerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {comments.map((c) => (
        <Pin key={c.id} comment={c} viewport={viewport} layerRef={layerRef} />
      ))}
    </div>
  );
}
