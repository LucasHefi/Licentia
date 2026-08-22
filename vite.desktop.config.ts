import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL("./desktop", import.meta.url).pathname,
  base: "./",
  publicDir: new URL("./public", import.meta.url).pathname,
  plugins: [react()],
  build: {
    outDir: new URL("./desktop-dist", import.meta.url).pathname,
    emptyOutDir: true,
    target: ["es2021", "chrome105", "safari13"],
  },
  clearScreen: false,
});
