"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@embertoast/react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Inbox } from "@/components/icons";
import { hueFor } from "@/lib/hues";

interface IncomingInvite {
  id: string;
  boardName: string;
  inviterName: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [invites, setInvites] = useState<IncomingInvite[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () =>
    fetch("/api/invites")
      .then((r) => r.json())
      .then((d: { invites?: IncomingInvite[] }) => setInvites(d.invites ?? []))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);
  // Refresh the moment the panel opens, so it never shows a stale count.
  useEffect(() => {
    if (open) load();
  }, [open]);

  async function act(inv: IncomingInvite, action: "accept" | "reject") {
    setActing(inv.id);
    try {
      const res = await fetch(`/api/invites/${inv.id}/${action}`, { method: "POST" });
      if (!res.ok) {
        toast.error(action === "accept" ? "Couldn't accept the invite." : "Couldn't decline the invite.");
        setActing(null);
        return;
      }
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
      setActing(null);
      if (action === "accept") {
        toast.success(`You joined “${inv.boardName}”.`);
        router.refresh();
      } else {
        toast(`Declined the invite to “${inv.boardName}”.`);
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
      setActing(null);
    }
  }

  const count = invites.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Notifications, ${count} new` : "Notifications"}
          className="relative grid size-10 place-items-center rounded-full border border-hairline bg-white text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink"
        >
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cursor-coral px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[380px] overflow-hidden rounded-2xl p-0 shadow-toolbar"
      >
        <div className="flex items-center justify-between px-4 py-3.5">
          <p className="text-[0.95rem] font-semibold tracking-tight text-ink">Notifications</p>
          {count > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{count} new</span>
          ) : null}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center px-6 pb-12 pt-6 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-ink/[0.04] text-ink-soft">
              <Inbox className="size-5" />
            </div>
            <p className="mt-3.5 text-sm font-semibold text-ink">You’re all caught up</p>
            <p className="mt-1 text-xs text-ink-soft">Board invitations will show up here.</p>
          </div>
        ) : (
          <ul className="max-h-[24rem] overflow-y-auto border-t border-hairline p-1.5">
            {invites.map((inv) => (
              <li key={inv.id}>
                <div className="flex gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-ink/[0.025]">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: hueFor(inv.id) }}
                  >
                    {inv.inviterName.trim().slice(0, 1).toUpperCase() || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink">
                      <span className="font-semibold">{inv.inviterName}</span> invited you to <span className="font-semibold">{inv.boardName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">Board invitation</p>
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 rounded-lg px-3.5 text-xs font-semibold"
                        disabled={acting === inv.id}
                        onClick={() => act(inv, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3.5 text-xs font-medium"
                        disabled={acting === inv.id}
                        onClick={() => act(inv, "reject")}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
