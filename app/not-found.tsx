import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cursor-sky">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">This board drifted off-canvas</h1>
      <p className="mt-2 max-w-sm text-ink-soft">The page you’re after doesn’t exist, or you don’t have access to it.</p>
      <div className="mt-7 flex gap-2">
        <Button asChild className="h-10 rounded-lg font-semibold">
          <Link href="/boards">Go to your boards</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 rounded-lg">
          <Link href="/board/demo">Open the demo</Link>
        </Button>
      </div>
    </main>
  );
}
