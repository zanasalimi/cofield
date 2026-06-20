# Contributing to Cofield

This project has strong conventions. Matching them keeps the canvas correct and the realtime layer predictable.

## Ground rules

- **Read before you write.** Match the patterns already in the directory you're touching: naming, error handling, file size. Don't impose a new style.
- **Strong typing end to end.** No `any` without a written reason. Validate anything crossing a boundary (the socket, env, user input).
- **Tests travel with code.** The pure modules, `src/canvas/geometry/` and `src/collab/`, are unit-tested. A behavior change there ships with a test. CRDT merge convergence and hit-testing are covered by tests, and they run without a browser.
- **Small, composable units.** Pure functions and narrow modules. No god-files, no 300-line functions.
- **Handle the unhappy path.** Empty, loading, disconnected, reconnecting, and error states are part of the feature.

## Getting set up

Requires Node 24+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm sync   # terminal 1 — Yjs sync server
pnpm dev    # terminal 2 — Next.js web app
```

Or run the whole stack in containers:

```bash
docker compose up
```

## Before you open a PR

Run the full gate locally. CI runs the same:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

State which of these you ran, and the result, in the PR description. If a change is risky, untested, or a guess, say so.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `build:`, `ci:`.

- Subject ≤ 50 characters, imperative mood ("add marquee select", not "added").
- Body only when the *why* isn't obvious from the diff.
- One concern per commit; keep diffs small and reviewable.
- Do not add tool or assistant attribution trailers (no `Co-Authored-By`, no "generated with"). Commits are authored in the first person.

## Architecture notes

- The **Yjs document is the source of truth** and is replicated to every client. The sync server relays and persists; it does not transform operations.
- **Presence (cursors, selection) is ephemeral** and lives on the Awareness channel. Never write it to the document.
- All **geometry is computed in world coordinates**; the viewport transform is applied only at render time. Keep it that way so selection and transforms stay correct under zoom.

If you're adding a non-obvious architectural decision, record it as an ADR in [docs/DECISIONS.md](docs/DECISIONS.md).
