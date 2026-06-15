"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewBoardForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (res.ok) {
      const { board } = (await res.json()) as { board: { id: string } };
      router.push(`/board/${board.id}`);
    }
  }

  return (
    <form onSubmit={create} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New board name…"
        className="w-48"
        aria-label="New board name"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}
