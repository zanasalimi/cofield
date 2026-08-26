import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Every suite is pure: geometry, CRDT merge, the transport state machine,
    // component draw calls against a stub 2D context. Nothing needs a DOM, so
    // none is installed.
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    globals: true,
  },
});
