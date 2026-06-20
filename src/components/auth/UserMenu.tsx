"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@embertoast/react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { LogOut } from "@/components/icons";
import { hueFor } from "@/lib/hues";

export function UserMenu({ id, name, email }: { id: string; name: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const hue = hueFor(id);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      toast.success("Signed out.");
      router.push("/signin");
      router.refresh();
    } catch {
      toast.error("Couldn't sign out. Try again.");
      setBusy(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full border border-hairline bg-chrome py-1 pl-1 pr-3 transition-colors hover:bg-ink/[0.03]"
        >
          <span className="grid size-8 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: hue }}>
            {name.trim().slice(0, 1).toUpperCase() || "?"}
          </span>
          <span className="hidden max-w-[12ch] truncate text-sm font-medium text-ink sm:block">{name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0">
        <div className="border-b border-hairline px-3.5 py-3">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-soft">{email}</p>
        </div>
        <div className="p-1">
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
          >
            <LogOut className="size-4 text-ink-soft" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
