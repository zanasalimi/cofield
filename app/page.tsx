/**
 * Landing page. Auth-aware: signed-out visitors get the value prop + sign-up;
 * signed-in users get a path to their boards. The live mini-board is the proof.
 */
import Link from "next/link";
import { getCurrentUser } from "@/auth/server";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { LiveMiniBoard } from "./_landing/LiveMiniBoard";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-5">
        <span className="font-sans text-lg font-semibold tracking-tight">Cofield</span>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">
              {user.name}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        )}
      </header>

      <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="max-w-md">
          <h1 className="font-sans text-4xl font-semibold leading-tight tracking-tight">
            One board. Many people. No data race.
          </h1>
          <p className="mt-4 text-ink-soft">
            An infinite canvas where everyone edits at once — live cursors, presence, and
            offline-safe merge. Built on CRDTs, so concurrent edits converge instead of
            clobbering each other.
          </p>
          <div className="mt-6 flex gap-2">
            {user ? (
              <>
                <Button asChild>
                  <Link href="/boards">Your boards</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/board/demo">Open the demo board</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/signup">Start free</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/board/demo">Try the demo</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <LiveMiniBoard />
      </section>
    </main>
  );
}
