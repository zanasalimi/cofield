"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface for diagnostics; never swallow.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cursor-coral">Something broke</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">That didn’t go to plan</h1>
      <p className="mt-2 max-w-sm text-ink-soft">An unexpected error interrupted this page. Your board data is safe — try again.</p>
      <div className="mt-7 flex gap-2">
        <Button onClick={reset} className="h-10 rounded-lg font-semibold">
          Try again
        </Button>
        <Button asChild variant="outline" className="h-10 rounded-lg">
          <a href="/boards">Back to boards</a>
        </Button>
      </div>
    </main>
  );
}
