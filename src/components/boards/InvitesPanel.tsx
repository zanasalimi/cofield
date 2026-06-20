"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@embertoast/react";
import { Button } from "@/components/ui/button";
import { Inbox } from "@/components/icons";

interface IncomingInvite {
  id: string;
  boardName: string;
  inviterName: string;
}

export function InvitesPanel() {
  const router = useRouter();
  const [invites, setInvites] = useState<IncomingInvite[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invites")
      .then((r) => r.json())
      .then((d: { invites?: IncomingInvite[] }) => setInvites(d.invites ?? []))
      .catch(() => {});
  }, []);

  async function act(invite: IncomingInvite, action: "accept" | "reject") {
    setActing(invite.id);
    try {
      const res = await fetch(`/api/invites/${invite.id}/${action}`, { method: "POST" });
      if (!res.ok) {
        toast.error(action === "accept" ? "Couldn't accept the invite." : "Couldn't decline the invite.");
        setActing(null);
        return;
      }
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      if (action === "accept") {
        toast.success(`You joined “${invite.boardName}”.`);
        router.refresh();
      } else {
        toast(`Declined the invite to “${invite.boardName}”.`);
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
      setActing(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <section className="mb-10 rounded-2xl border border-hairline bg-chrome p-5">
      <div className="flex items-center gap-2">
        <Inbox className="size-4 text-ink-soft" />
        <h2 className="text-sm font-semibold text-ink">
          Invitations <span className="font-normal text-ink-soft">· {invites.length}</span>
        </h2>
      </div>
      <div className="mt-4 space-y-2.5">
        {invites.map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-paper px-4 py-3">
            <p className="text-sm text-ink">
              <span className="font-semibold">{inv.inviterName}</span> invited you to <span className="font-semibold">{inv.boardName}</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 rounded-lg font-semibold" disabled={acting === inv.id} onClick={() => act(inv, "accept")}>
                Accept
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-lg" disabled={acting === inv.id} onClick={() => act(inv, "reject")}>
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
