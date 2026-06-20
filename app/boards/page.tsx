import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/server";
import { listBoardsForUser } from "@/boards/server";
import { NewBoardForm } from "@/components/boards/NewBoardForm";
import { InvitesPanel } from "@/components/boards/InvitesPanel";
import { BoardCard } from "@/components/boards/BoardCard";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";

export default async function BoardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const boards = listBoardsForUser(user.id);
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-hairline bg-paper/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/boards" className="text-lg font-bold tracking-tight text-ink">
            Cofield
          </Link>
          <UserMenu id={user.id} name={user.name} email={user.email} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <InvitesPanel />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back, {firstName}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {boards.length === 0 ? "Let’s start your first board." : `You have ${boards.length} board${boards.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <NewBoardForm />
        </div>

        {boards.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-chrome px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-ink/5 text-2xl">✶</div>
            <p className="mt-4 text-base font-semibold text-ink">No boards yet</p>
            <p className="mt-1 max-w-xs text-sm text-ink-soft">
              Create your first board, then invite your team — or take the demo for a spin.
            </p>
            <div className="mt-5 flex gap-2">
              <NewBoardForm />
              <Button asChild variant="outline" className="h-10 rounded-lg">
                <Link href="/board/demo">Try the demo</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <BoardCard key={b.id} board={{ id: b.id, name: b.name, role: b.role }} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
