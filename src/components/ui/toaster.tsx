/**
 * Client boundary around embertoast's <Toaster/>. The library's component uses
 * useSyncExternalStore, so it must render inside a "use client" module — the root
 * layout is a server component and can't host it directly.
 */
"use client";

import { Toaster as EmberToaster } from "@embertoast/react";

export function Toaster() {
  return <EmberToaster position="bottom-right" closeButton expand />;
}
