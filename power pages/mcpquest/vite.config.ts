import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const here = path.dirname(fileURLToPath(import.meta.url));
// The judge and shared contract live in the Function App, which is their source of truth.
const mcpquest = path.resolve(here, "../../azure/functions/game/src/mcpquest");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@mcpquest": mcpquest },
  },
  server: {
    port: 5177,
    fs: { allow: ["../.."] },
  },
});
