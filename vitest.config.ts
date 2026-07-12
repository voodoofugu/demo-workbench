import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest runs only the React DOM behaviour tests (`*.dom.test.tsx`) in a
// happy-dom environment. The Node-side compiler / package tests keep running
// under `node --test` on the `*.test.mjs` files, so the two runners never
// overlap.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ["test/**/*.dom.test.{ts,tsx}"],
    environment: "happy-dom",
  },
});
