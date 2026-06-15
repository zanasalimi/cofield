/**
 * Team board list (v1). Org → Team → Board: team membership scopes which boards
 * a user sees. The grid shows each board's last-edited and live-presence pips.
 */

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;

  // TODO(v1): fetch the team's boards; render an asymmetric grid (not centered
  // cards) with empty / loading / error states. `teamId` scopes the query.
  void teamId;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
      {/* TODO(v1): board grid + create action + empty/loading/error states */}
    </main>
  );
}
