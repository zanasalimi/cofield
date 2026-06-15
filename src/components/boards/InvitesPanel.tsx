"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IncomingInvite {
  id: string;
  boardName: string;
  inviterName: string;
}

export function InvitesPanel() {
  const router = useRouter();
  const [invites, setInvites] = useState<IncomingInvite[]>([]);

  useEffect(() => {
    fetch("/api/invites")
      .then((r) => r.json())
      .then((d: { invites?: IncomingInvite[] }) => setInvites(d.invites ?? []))
      .catch(() => {});
  }, []);

  async function act(id: string, action: "accept" | "reject") {
    const res = await fetch(`/api/invites/${id}/${action}`, { method: "POST" });
    setInvites((prev) => prev.filter((i) => i.id !== id));
    if (action === "accept" && res.ok) router.refresh();
  }

  if (invites.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Invitations</h2>
      <div className="mt-3 space-y-2">
        {invites.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="text-sm">
                <span className="font-medium">{inv.inviterName}</span> invited you to{" "}
                <span className="font-medium">{inv.boardName}</span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => act(inv.id, "accept")}>
                  Accept
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act(inv.id, "reject")}>
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
