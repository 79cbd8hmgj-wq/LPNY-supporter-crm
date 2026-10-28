import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Vitest 5 defaults this to true; preserve existing test-isolation behavior.
    clearMocks: false,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
