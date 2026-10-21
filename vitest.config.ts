import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { testTimeout: 60_000, hookTimeout: 60_000, include: ["tests/**/*.test.ts", "lib/**/*.test.ts", "server/**/*.test.ts"] },
});
