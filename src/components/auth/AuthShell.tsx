/**
 * Auth layout — a professional split: a quiet ink brand rail (desktop) beside the
 * form. No marketing landing; this is the front door, so it stays minimal and
 * gets out of the way. The rail collapses on mobile to just the wordmark.
 */
import Link from "next/link";

const POINTS = [
  { hue: "#2D9CDB", text: "Live multiplayer — cursors, presence, and selection in real time." },
  { hue: "#3FA34D", text: "Offline-safe by design. Concurrent edits converge, never clobber." },
  { hue: "#FF9F1C", text: "Diagrams, wireframes and flows, all on one infinite canvas." },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand rail — desktop only */}
      <aside className="relative hidden overflow-hidden bg-ink px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden
        />
        <Link href="/" className="relative z-10 text-xl font-bold tracking-tight">
          Cofield
        </Link>

        <div className="relative z-10 max-w-md">
          <h1 className="text-[2.7rem] font-semibold leading-[1.08] tracking-tight">
            The board your team actually stays in.
          </h1>
          <ul className="mt-9 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: p.hue }} />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/40">Built on CRDTs. Self-hostable. Yours.</p>
      </aside>

      {/* Form column */}
      <section className="flex flex-col bg-paper px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <Link href="/" className="text-xl font-bold tracking-tight text-ink">
            Cofield
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm animate-rise py-10">{children}</div>
        </div>
      </section>
    </main>
  );
}
