import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/server";
import { listBoardsForUser } from "@/boards/server";
import { NewBoardForm } from "@/components/boards/NewBoardForm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BoardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const boards = listBoardsForUser(user.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Cofield
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">{user.name}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your boards</h1>
        <NewBoardForm />
      </div>

      {boards.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-ink-soft">No boards yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first one above, then invite people to it.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Link key={b.id} href={`/board/${b.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <CardDescription className="capitalize">{b.role}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
