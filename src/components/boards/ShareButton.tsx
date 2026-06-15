"use client";

import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ShareButton({ boardId }: { boardId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<null | "sent" | "error">(null);

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const res = await fetch(`/api/boards/${boardId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setStatus("sent");
      setEmail("");
    } else {
      setStatus("error");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="pointer-events-auto shadow-sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to this board</DialogTitle>
          <DialogDescription>
            They&apos;ll find the invite in their dashboard once they sign in with this email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={invite} className="flex gap-2">
          <Input
            type="email"
            required
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Invitee email"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "…" : "Invite"}
          </Button>
        </form>
        {status === "sent" && <p className="text-sm text-[#3FA34D]">Invite sent.</p>}
        {status === "error" && <p className="text-sm text-destructive">Couldn&apos;t send that invite.</p>}
      </DialogContent>
    </Dialog>
  );
}
