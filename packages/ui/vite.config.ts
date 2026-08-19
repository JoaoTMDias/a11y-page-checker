import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/client", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
    },
  },
  build: { outDir: "dist/client", emptyOutDir: false, sourcemap: true },
  server: {
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://127.0.0.1:4174", changeOrigin: true } },
  },
});
