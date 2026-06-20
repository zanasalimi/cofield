/**
 * Share board — invite people, set the public/private link access + role, manage
 * the member list (owner / can edit / can view), copy the link or an embed code.
 * Sharing state (link access + members) lives in the synced board meta, so every
 * client sees the same access list; for real (non-demo) boards an invite also
 * hits the server invites API.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChevronDown, Check, Link2, Code2 } from "@/components/icons";
import { useBoardStore } from "@/store/board-store";
import { useUiStore } from "@/store/ui-store";

type Role = "owner" | "edit" | "view";
type Access = "restricted" | "view" | "edit";
interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const slug = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") || "user";
const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";
const COLORS = ["#FF5C5C", "#FF9F1C", "#3FA34D", "#2D9CDB", "#5B5BD6", "#C44CD9"];
const colorFor = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]!;

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
        <button type="button" className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-ink-soft transition-colors hover:bg-muted hover:text-ink">
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
  const [invitee, setInvitee] = useState("");
  const [copied, setCopied] = useState<null | "link" | "embed">(null);

  const access = (meta.access as Access | undefined) ?? "restricted";
  const members = useMemo(() => (Array.isArray(meta.members) ? (meta.members as Member[]) : []), [meta.members]);
  const url = typeof window !== "undefined" ? `${window.location.origin}/board/${boardId}` : `/board/${boardId}`;

  const setMembers = (next: Member[]) => useBoardStore.getState().setMeta({ members: next });

  // Seed the local user as owner the first time the dialog has no members.
  useEffect(() => {
    if (me && members.length === 0) {
      setMembers([{ id: me.userId, name: me.name, email: `${slug(me.name)}@cofield.app`, role: "owner" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.userId]);

  const invite = () => {
    const value = invitee.trim();
    if (!value) return;
    const email = value.includes("@") ? value : `${slug(value)}@cofield.app`;
    const name = value.includes("@") ? value.split("@")[0]!.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : value;
    if (!members.some((m) => m.email === email)) {
      setMembers([...members, { id: crypto.randomUUID(), name, email, role: "edit" }]);
    }
    if (canShare) {
      void fetch(`/api/boards/${boardId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
    }
    setInvitee("");
  };

  const copy = (text: string, which: "link" | "embed") => {
    void navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="default" className="rounded-lg px-5 font-semibold shadow-none">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <DialogTitle className="text-base font-semibold">Share board</DialogTitle>
        </div>

        {/* Invite */}
        <div className="px-5 py-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              invite();
            }}
          >
            <Input value={invitee} onChange={(e) => setInvitee(e.target.value)} placeholder="Email, name" className="h-10 min-w-0 flex-1" aria-label="Invite by email or name" />
            <Button type="submit" variant="secondary" size="lg" className="rounded-lg px-5">
              Invite
            </Button>
          </form>
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
              className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition-transform active:scale-95"
            >
              {copied === "link" ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Members */}
        <div className="border-t border-hairline px-5 py-4">
          <p className="mb-3 text-sm text-ink-soft">Member with access</p>
          <div className="flex flex-col gap-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: colorFor(m.id) }}>
                  {initial(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{m.name}{me && m.id === me.userId ? " (you)" : ""}</p>
                  <p className="truncate text-xs text-ink-soft">{m.email}</p>
                </div>
                {m.role === "owner" ? (
                  <span className="text-sm text-ink-soft">owner</span>
                ) : (
                  <RoleSelect
                    value={m.role}
                    options={[
                      { value: "edit", label: "can edit" },
                      { value: "view", label: "can view" },
                      { value: "remove", label: "Remove access", danger: true },
                    ]}
                    onPick={(v) => {
                      if (v === "remove") setMembers(members.filter((x) => x.id !== m.id));
                      else setMembers(members.map((x) => (x.id === m.id ? { ...x, role: v as Role } : x)));
                    }}
                  />
                )}
              </div>
            ))}
          </div>
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
