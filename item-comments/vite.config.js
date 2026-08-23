import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

export default defineConfig({
  root: repoRoot,
  publicDir: false,
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    fs: { allow: [repoRoot] }
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: resolve(here, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(here, "index.html")
    }
  },
  plugins: [
    {
      name: "comments-tab-index",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/" || req.url === "/index.html") {
            res.statusCode = 302;
            res.setHeader("Location", "/item-comments/");
            res.end();
            return;
          }
          next();
        });
      }
    }
  ]
});
