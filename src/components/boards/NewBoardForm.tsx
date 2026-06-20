"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@embertoast/react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "@/components/icons";

export function NewBoardForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(j.error ?? "Couldn't create the board.");
        setLoading(false);
        return;
      }
      const { board } = (await res.json()) as { board: { id: string; name: string } };
      toast.success(`“${board.name}” is ready.`);
      router.push(`/board/${board.id}`);
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="h-10 gap-1.5 rounded-lg font-semibold">
          <Plus className="size-4" />
          New board
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <form onSubmit={create} className="space-y-2.5">
          <label htmlFor="new-board-name" className="text-sm font-medium text-ink">
            Board name
          </label>
          <Input
            id="new-board-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled board"
            className="h-10"
          />
          <Button type="submit" disabled={loading} className="h-10 w-full gap-2 font-semibold">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create board"
            )}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
