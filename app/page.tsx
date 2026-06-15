/**
 * Landing page. The product's multiplayer-ness is the marketing: a live mini
 * mini-board with ghost cursors moving (a recorded/looped demo board), not a
 * gradient hero and not an emoji feature grid.
 */
import { LiveMiniBoard } from "./_landing/LiveMiniBoard";

export default function LandingPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-6">
      {/* Left-aligned, asymmetric — not a centered marketing column. */}
      <section className="grid flex-1 items-center gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="max-w-md">
          <h1 className="font-sans text-4xl font-semibold leading-tight tracking-tight">
            One board. Many teams. No data race.
          </h1>
          <p className="mt-4 text-ink-soft">
            An infinite canvas where everyone edits at once — live cursors,
            presence, and offline-safe merge. Built on CRDTs, so concurrent
            edits converge instead of clobbering each other.
          </p>
          {/* TODO(M0): primary action → create/open a demo board */}
        </div>

        {/* The live proof, not a screenshot. */}
        <LiveMiniBoard />
      </section>
    </main>
  );
}
