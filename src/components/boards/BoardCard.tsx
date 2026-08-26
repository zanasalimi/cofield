import Link from "next/link";
import { hueFor } from "@/lib/hues";
import { initialOf } from "@/lib/initials";

export interface BoardCardData {
  id: string;
  name: string;
  role: string;
  /** Snapshot uploaded by a client that had the board open, or null until one has. */
  thumbnail: string | null;
}

/**
 * A board tile showing the board. The picture is a real render, produced by a
 * client that had the board open and stored on the row, because the shapes live
 * in the Yjs document on the sync server and its LevelDB store only opens in one
 * process. Until a board has been opened once there is nothing to show, so the
 * dotted paper stands in.
 */
export function BoardCard({ board }: { board: BoardCardData }) {
  const hue = hueFor(board.id);

  return (
    <Link
      href={`/board/${board.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-hairline bg-chrome transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-ink/15 hover:shadow-toolbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div
        className="relative aspect-[16/10] overflow-hidden bg-paper"
        style={
          board.thumbnail
            ? undefined
            : {
                backgroundImage: "radial-gradient(circle, rgba(26,26,26,0.13) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }
        }
      >
        {board.thumbnail ? (
          // A data URL: next/image has nothing to fetch, optimise or lazy-load.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={board.thumbnail}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-ink-soft">Empty board</span>
        )}
        <span
          className="absolute bottom-3 left-3 grid size-8 place-items-center rounded-lg text-xs font-bold text-white shadow-sm ring-2 ring-chrome"
          style={{ backgroundColor: hue }}
          aria-hidden
        >
          {initialOf(board.name)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3">
        <p className="min-w-0 truncate text-[0.95rem] font-semibold text-ink">{board.name}</p>
        <span className="shrink-0 text-xs font-medium capitalize text-ink-soft">{board.role}</span>
      </div>
    </Link>
  );
}
