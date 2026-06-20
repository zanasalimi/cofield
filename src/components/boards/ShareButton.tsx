/**
 * Share board — invite people by email, set the link access, and manage the
 * REAL member list (owner / can edit / can view). Members and pending invites
 * come from the server (the board's membership + invites tables), not the synced
 * doc, so the list reflects who actually has access. Role changes and removals
 * are owner-gated server calls. Link access (restricted/view/edit) is a board
 * setting kept in the synced meta so every client sees it.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChevronDown, Check, Link2, Code2 } from "@/components/icons";
import { useBoardStore } from "@/store/board-store";
import { useUiStore } from "@/store/ui-store";

type Access = "restricted" | "view" | "edit";

/** A real member row from the server (role is the DB enum). */
interface Member {
  id: string;
  name: string;
  email: string;
  color: string;
  role: "owner" | "editor" | "viewer";
}
interface PendingInvite {
  email: string;
  status: string;
}

const initial = (s: string) => s.trim().slice(0, 1).toUpperCase() || "?";
const ROLE_LABEL: Record<Member["role"], string> = { owner: "owner", editor: "can edit", viewer: "can view" };

/** A small role / access dropdown. */
function RoleSelect({
  value,
  options,
  onPick,
}: {
  value: string;
  options: { value: string; label: string; danger?: boolean }[];
  onPick: (v: string) => void;
}) {
  const cur = options.find((o) => o.value === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm text-ink-soft transition-colors hover:bg-muted hover:text-ink">
          {cur?.label ?? value}
          <ChevronDown className="size-3.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted ${o.danger ? "text-cursor-coral" : "text-ink"}`}
          >
            {o.label}
            {o.value === value ? <Check className="size-3.5 text-primary" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function ShareButton({ boardId, canShare }: { boardId: string; canShare: boolean }) {
  const meta = useBoardStore((s) => s.meta);
  const me = useUiStore((s) => s.me);
  const [open, setOpen] = useState(false);
  const [invitee, setInvitee] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<null | "link" | "embed">(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const access = (meta.access as Access | undefined) ?? "restricted";
  const url = typeof window !== "undefined" ? `${window.location.origin}/board/${boardId}` : `/board/${boardId}`;
  const iAmOwner = canShare && members.some((m) => m.id === me?.userId && m.role === "owner");

  const refetch = useCallback(async () => {
    if (!canShare) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/members`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { members: Member[]; invites: PendingInvite[] };
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
    } catch {
      setLoadError("Couldn't load members. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [boardId, canShare]);

  // Load the real member list each time the dialog opens.
  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  // The demo board has no membership row — show the current user as the owner
  // of their own view so the panel isn't empty.
  const shownMembers: Member[] = canShare
    ? members
    : me
      ? [{ id: me.userId, name: me.name, email: "Signed in on this device", color: me.color, role: "owner" }]
      : [];

  const invite = async () => {
    const email = invitee.trim();
    if (!email) return;
    if (!canShare) {
      setInviteError("Sharing is available on your own boards, not the demo.");
      return;
    }
    setInviteError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setInviteError(data.error ?? "Couldn't send the invite.");
        return;
      }
      setInvitee("");
      await refetch();
    } catch {
      setInviteError("Couldn't send the invite. Check your connection.");
    }
  };

  const changeRole = async (userId: string, role: string) => {
    if (role === "remove") {
      await fetch(`/api/boards/${boardId}/members/${userId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    }
    await refetch();
  };

  const copy = (text: string, which: "link" | "embed") => {
    void navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="default" className="rounded-lg px-5 font-semibold shadow-none">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <DialogTitle className="text-base font-semibold">Share board</DialogTitle>
        </div>

        {/* Invite */}
        <div className="px-5 py-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void invite();
            }}
          >
            <Input
              value={invitee}
              onChange={(e) => {
                setInvitee(e.target.value);
                if (inviteError) setInviteError(null);
              }}
              type="email"
              placeholder="Invite by email"
              className="h-10 min-w-0 flex-1"
              aria-label="Invite by email"
            />
            <Button type="submit" variant="secondary" size="lg" className="rounded-lg px-5">
              Invite
            </Button>
          </form>
          {inviteError ? <p className="mt-2 text-xs text-cursor-coral">{inviteError}</p> : null}
        </div>

        {/* Link access */}
        <div className="border-t border-hairline px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Link access</p>
              <p className="text-xs text-ink-soft">{access === "restricted" ? "Only invited people" : "Anyone with this link"}</p>
            </div>
            <RoleSelect
              value={access}
              options={[
                { value: "restricted", label: "Restricted" },
                { value: "view", label: "can view" },
                { value: "edit", label: "can edit" },
              ]}
              onPick={(v) => useBoardStore.getState().setMeta({ access: v })}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-11 min-w-0 flex-1 truncate rounded-lg bg-muted/50 px-3 text-sm leading-[2.75rem] text-ink-soft">{url}</div>
            <button
              type="button"
              onClick={() => copy(url, "link")}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition-transform active:scale-95"
            >
              {copied === "link" ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Members (real) */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-hairline px-5 py-4">
          <p className="mb-3 text-sm text-ink-soft">People with access</p>
          {loading && shownMembers.length === 0 ? (
            <p className="text-sm text-ink-soft">Loading members…</p>
          ) : loadError ? (
            <p className="text-sm text-cursor-coral">{loadError}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {shownMembers.map((m) => {
                const isMe = m.id === me?.userId;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: m.color }}>
                      {initial(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {m.name}
                        {isMe ? " (you)" : ""}
                      </p>
                      <p className="truncate text-xs text-ink-soft">{m.email}</p>
                    </div>
                    {m.role === "owner" || !iAmOwner || isMe ? (
                      <span className="shrink-0 text-sm text-ink-soft">{ROLE_LABEL[m.role]}</span>
                    ) : (
                      <RoleSelect
                        value={m.role}
                        options={[
                          { value: "editor", label: "can edit" },
                          { value: "viewer", label: "can view" },
                          { value: "remove", label: "Remove access", danger: true },
                        ]}
                        onPick={(v) => void changeRole(m.id, v)}
                      />
                    )}
                  </div>
                );
              })}

              {/* Pending invites — invited, not joined yet */}
              {invites.map((inv) => (
                <div key={inv.email} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/10 text-sm font-semibold text-ink-soft">
                    {initial(inv.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{inv.email}</p>
                    <p className="truncate text-xs text-ink-soft">Invited</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>
                </div>
              ))}

              {shownMembers.length === 0 && invites.length === 0 ? <p className="text-sm text-ink-soft">No members yet.</p> : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
          <button
            type="button"
            onClick={() => copy(`<iframe src="${url}/embed" width="800" height="600" frameborder="0"></iframe>`, "embed")}
            className="flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <Code2 className="size-4" />
            {copied === "embed" ? "Embed code copied" : "Get embed code"}
          </button>
          <button type="button" onClick={() => copy(url, "link")} className="flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink">
            <Link2 className="size-4" />
            Copy link
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
