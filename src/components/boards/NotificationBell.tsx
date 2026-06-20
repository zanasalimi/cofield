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
          className="relative grid size-10 place-items-center rounded-full border border-hairline bg-chrome text-ink-soft transition-colors hover:bg-ink/[0.03] hover:text-ink"
        >
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cursor-coral px-1 text-[10px] font-bold leading-none text-white ring-2 ring-paper">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {count > 0 ? (
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink-soft">
              {count} invite{count === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-ink/5 text-ink-soft">
              <Inbox className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-ink">You’re all caught up</p>
            <p className="mt-0.5 text-xs text-ink-soft">Board invitations will show up here.</p>
          </div>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-hairline overflow-y-auto">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-paper">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: hueFor(inv.id) }}
                >
                  {inv.inviterName.trim().slice(0, 1).toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">
                    <span className="font-semibold">{inv.inviterName}</span> invited you to <span className="font-semibold">{inv.boardName}</span>
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 rounded-md px-3 text-xs font-semibold"
                      disabled={acting === inv.id}
                      onClick={() => act(inv, "accept")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md px-3 text-xs"
                      disabled={acting === inv.id}
                      onClick={() => act(inv, "reject")}
                    >
                      Decline
                    </Button>
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
