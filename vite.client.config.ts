import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // Treat public/ as the Vite root so index.html is the entry and
  // output flattens to dist/client/index.html (not dist/client/public/).
  root: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "public/index.html"),
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  publicDir: false,
});
