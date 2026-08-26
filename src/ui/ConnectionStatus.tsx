/**
 * The realtime transport's health, in the header.
 *
 * A collaborative canvas that quietly stops syncing looks identical to one that
 * is working, so every non-connected state gets a visible pill. Healthy renders
 * nothing: silence is the signal that the socket is live.
 */
"use client";

import { useUiStore } from "@/store/ui-store";
import type { ConnectionState } from "@/collab/types";

interface Look {
  label: string;
  /** Sits under the label. Always shown, so the state is legible without hovering. */
  detail: string;
  dot: string;
  pulse: boolean;
}

const LOOKS: Record<Exclude<ConnectionState, "connected">, Look> = {
  connecting: { label: "Connecting", detail: "Joining the board", dot: "bg-cursor-amber", pulse: true },
  reconnecting: { label: "Reconnecting", detail: "Your edits are saved locally", dot: "bg-cursor-amber", pulse: true },
  disconnected: { label: "Offline", detail: "Your edits are saved locally", dot: "bg-ink-soft", pulse: false },
  error: { label: "Sync failed", detail: "Reload to try again", dot: "bg-cursor-coral", pulse: false },
};

export function ConnectionStatus() {
  const connection = useUiStore((s) => s.connection);
  const reason = useUiStore((s) => s.connectionReason);

  if (connection === "connected") return null;
  const look = LOOKS[connection];

  // Only a terminal error carries a message written for a person: that reason
  // comes from our own server's close frame ("access changed"). Everything else
  // is transport diagnostics, and "Can't reach ws://localhost:4321" tells a user
  // nothing they can act on while leaking where the infrastructure lives.
  const detail = connection === "error" && reason ? reason : look.detail;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pop flex items-center gap-2 rounded-xl border border-hairline bg-chrome py-1.5 pl-2.5 pr-3 shadow-sm"
    >
      <span className={`size-2 shrink-0 rounded-full ${look.dot} ${look.pulse ? "animate-pulse" : ""}`} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-sm font-medium text-ink">{look.label}</span>
        <span className="max-w-[28ch] truncate text-xs text-ink-soft">{detail}</span>
      </span>
    </div>
  );
}
