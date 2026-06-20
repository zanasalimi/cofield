import Link from "next/link";
import { hueFor } from "@/lib/hues";
import { Avatar } from "@/components/ui/avatar";
import { ArrowRight } from "@/components/icons";

export interface BoardCardData {
  id: string;
  name: string;
  role: string;
}

/** A tactile board tile carrying its stable brand hue as the accent. */
export function BoardCard({ board }: { board: BoardCardData }) {
  const hue = hueFor(board.id);

  return (
    <Link
      href={`/board/${board.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-chrome transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-toolbar"
    >
      <span className="h-1.5 w-full" style={{ backgroundColor: hue }} aria-hidden />
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between">
          <Avatar name={board.name} color={hue} fallback="B" className="size-11 rounded-xl text-base font-bold shadow-sm" />
          <span className="rounded-full border border-hairline px-2.5 py-0.5 text-xs font-medium capitalize text-ink-soft">{board.role}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold text-ink">{board.name}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Open board <ArrowRight className="size-3.5" />
          </p>
        </div>
      </div>
    </Link>
  );
}
